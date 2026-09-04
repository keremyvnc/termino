import { execFile } from 'child_process'
import { promisify } from 'util'
import type { AdapterInfo } from '@shared/types'

const run = promisify(execFile)

const SCRIPT = [
  "$ErrorActionPreference = 'SilentlyContinue'",
  '$out = foreach ($a in Get-NetAdapter) {',
  '  $ips = @(Get-NetIPAddress -InterfaceIndex $a.ifIndex -AddressFamily IPv4 | Select-Object -ExpandProperty IPAddress)',
  '  $if = Get-NetIPInterface -InterfaceIndex $a.ifIndex -AddressFamily IPv4',
  '  [pscustomobject]@{',
  '    name = $a.Name',
  '    description = $a.InterfaceDescription',
  '    mac = $a.MacAddress',
  '    status = [string]$a.Status',
  '    ipv4 = $ips',
  "    dhcp = ($if.Dhcp -eq 'Enabled')",
  '  }',
  '}',
  '@($out) | ConvertTo-Json -Compress -Depth 3'
].join('\n')

/** Get-NetAdapter ile adaptorleri listeler. Yonetici hakki gerektirmez. */
export async function listAdapters(): Promise<AdapterInfo[]> {
  const { stdout } = await run(
    'powershell.exe',
    ['-NoProfile', '-NonInteractive', '-ExecutionPolicy', 'Bypass', '-Command', SCRIPT],
    { windowsHide: true, maxBuffer: 4 * 1024 * 1024 }
  )
  const text = stdout.trim()
  if (!text) return []
  const parsed = JSON.parse(text)
  const arr: Record<string, unknown>[] = Array.isArray(parsed) ? parsed : [parsed]
  return arr.map((a) => ({
    name: String(a.name ?? ''),
    description: String(a.description ?? ''),
    mac: String(a.mac ?? ''),
    status: String(a.status ?? ''),
    ipv4: Array.isArray(a.ipv4) ? (a.ipv4 as string[]) : a.ipv4 ? [String(a.ipv4)] : [],
    dhcp: Boolean(a.dhcp)
  }))
}

/**
 * Adaptor degisikliklerini izler. Simdilik periyodik tarama; degisiklik oldugunda cb cagrilir.
 * Ileride WMI olayi (Win32_NetworkAdapter) ile degistirilebilir.
 */
export function watchAdapters(
  cb: (adapters: AdapterInfo[]) => void,
  intervalMs = 3000
): () => void {
  let last = ''
  let stopped = false
  let busy = false
  const tick = async (): Promise<void> => {
    if (stopped || busy) return
    busy = true
    try {
      const adapters = await listAdapters()
      const sig = JSON.stringify(adapters)
      if (sig !== last) {
        last = sig
        cb(adapters)
      }
    } catch (e) {
      console.warn('Adaptor taramasi basarisiz', e)
    } finally {
      busy = false
    }
  }
  void tick()
  const timer = setInterval(tick, intervalMs)
  return () => {
    stopped = true
    clearInterval(timer)
  }
}
