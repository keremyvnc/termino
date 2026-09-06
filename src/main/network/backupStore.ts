import { app } from 'electron'
import { promises as fs } from 'fs'
import { join } from 'path'
import type { AdapterInfo } from '@shared/types'
import type { NetBackup } from '@shared/ipc'
import { runPowerShell } from './powershell'
import { readStateScript } from './profileScripts'

/**
 * Adaptorun ilk uygulamadan onceki durumunu saklar:
 * %APPDATA%/termino/netbackups/<mac>.json. Geri yukleme bu dosyayi kullanir ve siler.
 */
export class NetBackupStore {
  private get directory(): string {
    return join(app.getPath('userData'), 'netbackups')
  }

  private fileFor(mac: string): string {
    return join(this.directory, `${mac.replace(/[^0-9A-Fa-f]/g, '')}.json`)
  }

  async read(mac: string): Promise<NetBackup | null> {
    try {
      return JSON.parse(await fs.readFile(this.fileFor(mac), 'utf8'))
    } catch {
      return null
    }
  }

  /** Yedek yoksa mevcut durumu alir; varsa ilk yedegi korur. */
  async captureOnce(adapter: AdapterInfo): Promise<void> {
    if (await this.read(adapter.mac)) return
    await this.capture(adapter)
  }

  /** Adaptorun mevcut IPv4 durumunu okur (yonetici gerekmez) ve yedek olarak yazar. */
  async capture(adapter: AdapterInfo): Promise<NetBackup> {
    const stdout = await runPowerShell(readStateScript(adapter.mac))
    const backup = toBackup(adapter, JSON.parse(stdout.trim() || '{}'))
    await fs.mkdir(this.directory, { recursive: true })
    await fs.writeFile(this.fileFor(adapter.mac), JSON.stringify(backup, null, 2), 'utf8')
    return backup
  }

  async delete(mac: string): Promise<void> {
    await fs.rm(this.fileFor(mac), { force: true })
  }
}

function toBackup(adapter: AdapterInfo, state: Record<string, unknown>): NetBackup {
  const dns = state.dns
  return {
    mac: adapter.mac,
    adapterName: adapter.name,
    takenAt: new Date().toISOString(),
    dhcp: Boolean(state.dhcp),
    ip: (state.ip as string) ?? undefined,
    prefixLength: (state.prefixLength as number) ?? undefined,
    gateway: (state.gateway as string) ?? undefined,
    dns: Array.isArray(dns) ? (dns as string[]) : dns ? [String(dns)] : []
  }
}
