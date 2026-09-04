import { app } from 'electron'
import { execFile } from 'child_process'
import { promises as fs } from 'fs'
import { join } from 'path'
import { promisify } from 'util'
import type { AdapterInfo, NetworkProfile } from '@shared/types'
import type { NetApplyResult, NetBackup } from '@shared/ipc'
import { listAdapters } from './network'

const run = promisify(execFile)

const IP_RE = /^(25[0-5]|2[0-4]\d|1?\d?\d)(\.(25[0-5]|2[0-4]\d|1?\d?\d)){3}$/
const MAC_RE = /^([0-9A-Fa-f]{2}-){5}[0-9A-Fa-f]{2}$/

function assertIp(v: string, label: string): void {
  if (!IP_RE.test(v)) throw new Error(`${label} gecersiz: ${v}`)
}
function assertMac(v: string): void {
  if (!MAC_RE.test(v)) throw new Error(`MAC gecersiz: ${v}`)
}

/** Yedekler %APPDATA%/termino/netbackups/<mac>.json */
function backupDir(): string {
  return join(app.getPath('userData'), 'netbackups')
}
function backupFile(mac: string): string {
  return join(backupDir(), `${mac.replace(/[^0-9A-Fa-f]/g, '')}.json`)
}

export async function getBackup(mac: string): Promise<NetBackup | null> {
  try {
    return JSON.parse(await fs.readFile(backupFile(mac), 'utf8'))
  } catch {
    return null
  }
}

/** Adaptorun mevcut IPv4 durumunu okur (yonetici gerekmez) ve yedek olarak yazar. */
async function snapshot(adapter: AdapterInfo): Promise<NetBackup> {
  const script = [
    "$ErrorActionPreference = 'SilentlyContinue'",
    `$a = Get-NetAdapter | Where-Object MacAddress -eq '${adapter.mac}' | Select-Object -First 1`,
    '$ip = Get-NetIPAddress -InterfaceIndex $a.ifIndex -AddressFamily IPv4 | Where-Object PrefixOrigin -ne WellKnown | Select-Object -First 1',
    "$gw = (Get-NetRoute -InterfaceIndex $a.ifIndex -DestinationPrefix '0.0.0.0/0' | Select-Object -First 1).NextHop",
    '$dns = @((Get-DnsClientServerAddress -InterfaceIndex $a.ifIndex -AddressFamily IPv4).ServerAddresses)',
    '$dhcp = (Get-NetIPInterface -InterfaceIndex $a.ifIndex -AddressFamily IPv4).Dhcp -eq "Enabled"',
    '[pscustomobject]@{ dhcp=$dhcp; ip=$ip.IPAddress; prefixLength=$ip.PrefixLength; gateway=$gw; dns=$dns } | ConvertTo-Json -Compress'
  ].join('\n')
  const { stdout } = await run(
    'powershell.exe',
    ['-NoProfile', '-NonInteractive', '-ExecutionPolicy', 'Bypass', '-Command', script],
    { windowsHide: true }
  )
  const j = JSON.parse(stdout.trim() || '{}')
  const backup: NetBackup = {
    mac: adapter.mac,
    adapterName: adapter.name,
    takenAt: new Date().toISOString(),
    dhcp: Boolean(j.dhcp),
    ip: j.ip ?? undefined,
    prefixLength: j.prefixLength ?? undefined,
    gateway: j.gateway ?? undefined,
    dns: Array.isArray(j.dns) ? j.dns : j.dns ? [j.dns] : []
  }
  await fs.mkdir(backupDir(), { recursive: true })
  await fs.writeFile(backupFile(adapter.mac), JSON.stringify(backup, null, 2), 'utf8')
  return backup
}

/**
 * Verilen PowerShell govdesini UAC ile yukseltilmis olarak calistirir.
 * Sonuc JSON'u gecici dosyaya yazilir; cikis kodu ve mesaj geri doner.
 */
async function runElevated(body: string): Promise<NetApplyResult> {
  const dir = join(app.getPath('temp'), 'termino')
  await fs.mkdir(dir, { recursive: true })
  const stamp = Date.now().toString(36)
  const scriptPath = join(dir, `net-${stamp}.ps1`)
  const resultPath = join(dir, `net-${stamp}.json`)

  const script = [
    "$ErrorActionPreference = 'Stop'",
    `$resultPath = '${resultPath.replace(/'/g, "''")}'`,
    'try {',
    body,
    "  [IO.File]::WriteAllText($resultPath, ([pscustomobject]@{ ok=$true; message='' } | ConvertTo-Json -Compress), (New-Object Text.UTF8Encoding $false))",
    '  exit 0',
    '} catch {',
    '  [IO.File]::WriteAllText($resultPath, ([pscustomobject]@{ ok=$false; message=$_.Exception.Message } | ConvertTo-Json -Compress), (New-Object Text.UTF8Encoding $false))',
    '  exit 1',
    '}'
  ].join('\n')
  await fs.writeFile(scriptPath, '﻿' + script, 'utf8')

  // Yukseltmeyi disaridan bir powershell ile tetikliyoruz; UAC iptal edilirse hata firlatir.
  const launcher = [
    `$p = Start-Process -FilePath 'powershell.exe' -Verb RunAs -WindowStyle Hidden -Wait -PassThru -ArgumentList @('-NoProfile','-NonInteractive','-ExecutionPolicy','Bypass','-File','${scriptPath.replace(/'/g, "''")}')`,
    'exit $p.ExitCode'
  ].join('\n')

  let exitCode = 0
  try {
    await run(
      'powershell.exe',
      ['-NoProfile', '-NonInteractive', '-ExecutionPolicy', 'Bypass', '-Command', launcher],
      { windowsHide: true }
    )
  } catch (e) {
    exitCode = -1
    const err = e as { code?: number | string; stderr?: string; message?: string }
    // Cikis kodu 1 ise betik kendi sonucunu yazmis olabilir; asagida okunur.
    if (typeof err.code === 'number') exitCode = err.code
    if (err.code !== 1) {
      const text = String(err.stderr || err.message || '')
      const cancelled = /canceled|iptal|1223/i.test(text)
      await fs.rm(scriptPath, { force: true })
      return { ok: false, message: cancelled ? 'Yönetici onayı iptal edildi.' : text.trim() }
    }
  }

  // Betik kendi sonucunu yazdi; okunamazsa cikis koduna guven.
  let result: NetApplyResult = exitCode === 0
    ? { ok: true, message: '' }
    : { ok: false, message: 'Yükseltilmiş betik hata verdi, ayrıntı alınamadı.' }
  try {
    const raw = (await fs.readFile(resultPath, 'utf8')).replace(/^﻿/, '')
    result = JSON.parse(raw)
  } catch {
    /* yukarida varsayilan var */
  }
  await Promise.all([fs.rm(scriptPath, { force: true }), fs.rm(resultPath, { force: true })])
  return result
}

function adapterLookup(mac: string): string {
  return [
    `$a = Get-NetAdapter | Where-Object MacAddress -eq '${mac}' | Select-Object -First 1`,
    `if (-not $a) { throw 'Adaptör bulunamadı: ${mac}' }`,
    '$idx = $a.ifIndex'
  ].join('\n')
}

function clearIpv4(): string {
  return [
    "Get-NetRoute -InterfaceIndex $idx -AddressFamily IPv4 -DestinationPrefix '0.0.0.0/0' -ErrorAction SilentlyContinue | Remove-NetRoute -Confirm:$false -ErrorAction SilentlyContinue",
    'Get-NetIPAddress -InterfaceIndex $idx -AddressFamily IPv4 -ErrorAction SilentlyContinue | Where-Object PrefixOrigin -ne WellKnown | Remove-NetIPAddress -Confirm:$false -ErrorAction SilentlyContinue'
  ].join('\n')
}

async function findAdapter(mac: string): Promise<AdapterInfo> {
  assertMac(mac)
  const a = (await listAdapters()).find((x) => x.mac === mac)
  if (!a) throw new Error('Adaptör şu an takılı değil.')
  return a
}

export async function applyProfile(mac: string, profile: NetworkProfile): Promise<NetApplyResult> {
  const adapter = await findAdapter(mac)
  assertIp(profile.ip, 'IP')
  if (profile.gateway) assertIp(profile.gateway, 'Ağ geçidi')
  for (const d of profile.dns ?? []) assertIp(d, 'DNS')
  const prefix = Math.min(32, Math.max(1, Math.floor(profile.prefixLength)))

  // Ayni ayar zaten uygulanmissa UAC'ye gerek yok.
  if (!adapter.dhcp && adapter.ipv4.includes(profile.ip)) {
    const b = await getBackup(mac)
    if (b) return { ok: true, message: 'Profil zaten uygulanmış.' }
  }

  const existing = await getBackup(mac)
  // Ilk uygulamada orijinal durumu yedekle; sonraki uygulamalarda ilk yedegi koru.
  if (!existing) await snapshot(adapter)

  const dns = profile.dns ?? []
  const body = [
    adapterLookup(mac),
    'Set-NetIPInterface -InterfaceIndex $idx -AddressFamily IPv4 -Dhcp Disabled',
    clearIpv4(),
    `New-NetIPAddress -InterfaceIndex $idx -IPAddress '${profile.ip}' -PrefixLength ${prefix}` +
      (profile.gateway ? ` -DefaultGateway '${profile.gateway}'` : '') +
      ' | Out-Null',
    dns.length
      ? `Set-DnsClientServerAddress -InterfaceIndex $idx -ServerAddresses @(${dns.map((d) => `'${d}'`).join(',')})`
      : 'Set-DnsClientServerAddress -InterfaceIndex $idx -ResetServerAddresses'
  ].join('\n')

  const r = await runElevated(body)
  return r.ok ? { ok: true, message: `${adapter.name} → ${profile.ip}/${prefix}` } : r
}

export async function setDhcp(mac: string): Promise<NetApplyResult> {
  const adapter = await findAdapter(mac)
  if (!(await getBackup(mac))) await snapshot(adapter)
  const body = [
    adapterLookup(mac),
    clearIpv4(),
    'Set-NetIPInterface -InterfaceIndex $idx -AddressFamily IPv4 -Dhcp Enabled',
    'Set-DnsClientServerAddress -InterfaceIndex $idx -ResetServerAddresses',
    'Restart-NetAdapter -InputObject $a -Confirm:$false -ErrorAction SilentlyContinue'
  ].join('\n')
  const r = await runElevated(body)
  return r.ok ? { ok: true, message: `${adapter.name} DHCP'ye alındı.` } : r
}

/** Ilk uygulamadan onceki duruma dondurur ve yedegi siler. */
export async function restoreBackup(mac: string): Promise<NetApplyResult> {
  const backup = await getBackup(mac)
  if (!backup) return { ok: false, message: 'Bu adaptör için yedek yok.' }
  let r: NetApplyResult
  if (backup.dhcp || !backup.ip) {
    r = await setDhcp(mac)
  } else {
    r = await applyProfile(mac, {
      adapterMac: mac,
      ip: backup.ip,
      prefixLength: backup.prefixLength ?? 24,
      gateway: backup.gateway,
      dns: backup.dns,
      autoApply: false
    })
  }
  if (r.ok) {
    await fs.rm(backupFile(mac), { force: true })
    r = { ok: true, message: `Önceki ayar geri yüklendi (${backup.dhcp ? 'DHCP' : backup.ip}).` }
  }
  return r
}
