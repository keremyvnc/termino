import type { AdapterInfo } from '@shared/types'
import { runPowerShell } from './powershell'

/** Adaptor listesini okuyan kaynak. Izleyici ve yapilandirici buna bakar (DIP). */
export interface AdapterSource {
  list(): Promise<AdapterInfo[]>
}

const LIST_SCRIPT = [
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

const MAX_OUTPUT = 4 * 1024 * 1024

function toAdapterInfo(raw: Record<string, unknown>): AdapterInfo {
  return {
    name: String(raw.name ?? ''),
    description: String(raw.description ?? ''),
    mac: String(raw.mac ?? ''),
    status: String(raw.status ?? ''),
    ipv4: Array.isArray(raw.ipv4) ? (raw.ipv4 as string[]) : raw.ipv4 ? [String(raw.ipv4)] : [],
    dhcp: Boolean(raw.dhcp)
  }
}

/** Get-NetAdapter ile adaptorleri listeler. Yonetici hakki gerektirmez. */
export async function listAdapters(): Promise<AdapterInfo[]> {
  const stdout = (await runPowerShell(LIST_SCRIPT, MAX_OUTPUT)).trim()
  if (!stdout) return []
  const parsed = JSON.parse(stdout)
  const rows: Record<string, unknown>[] = Array.isArray(parsed) ? parsed : [parsed]
  return rows.map(toAdapterInfo)
}

/** Varsayilan kaynak: sistemin gercek adaptorleri. */
export const systemAdapters: AdapterSource = { list: listAdapters }

/**
 * Adaptor degisikliklerini periyodik tarama ile izler ve yalnizca liste
 * degistiginde haber verir. Ileride WMI olayina gecilirse yalnizca bu sinif degisir.
 */
export class AdapterWatcher {
  private timer: ReturnType<typeof setInterval> | null = null
  private lastSignature = ''
  private scanning = false

  constructor(
    private readonly onChange: (adapters: AdapterInfo[]) => void,
    private readonly intervalMs = 3000,
    private readonly source: AdapterSource = systemAdapters
  ) {}

  start(): void {
    if (this.timer) return
    void this.scan()
    this.timer = setInterval(() => void this.scan(), this.intervalMs)
  }

  stop(): void {
    if (!this.timer) return
    clearInterval(this.timer)
    this.timer = null
  }

  private async scan(): Promise<void> {
    if (this.scanning) return
    this.scanning = true
    try {
      const adapters = await this.source.list()
      const signature = JSON.stringify(adapters)
      if (signature === this.lastSignature) return
      this.lastSignature = signature
      this.onChange(adapters)
    } catch (e) {
      console.warn('Adapter scan failed', e)
    } finally {
      this.scanning = false
    }
  }
}
