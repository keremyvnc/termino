import type { AdapterInfo, NetworkProfile } from '@shared/types'
import type { NetApplyResult, NetBackup } from '@shared/ipc'
import { systemAdapters, type AdapterSource } from './adapters'
import { NetBackupStore } from './backupStore'
import { ElevatedRunner } from './elevated'
import { applyProfileScript, dhcpScript } from './profileScripts'
import { assertIpv4, assertMac, clampPrefixLength } from './validation'

/**
 * Profil uygulayabilen her sey. AutoApplier somut sinifa degil buna bagimlidir (DIP),
 * boylece otomatik uygulama testte sahte bir uygulayici ile denenebilir.
 */
export interface NetworkApplier {
  applyProfile(mac: string, profile: NetworkProfile): Promise<NetApplyResult>
}

/**
 * Ag profili politikasi: ne zaman yedek alinir, ne zaman UAC'ye gerek yoktur,
 * geri yukleme neyi cagirir. PowerShell metni uretmez, surec calistirmaz;
 * bunlari `profileScripts`, `powershell` ve `ElevatedRunner` yapar.
 */
export class NetworkConfigurator implements NetworkApplier {
  constructor(
    private readonly backups = new NetBackupStore(),
    private readonly elevated = new ElevatedRunner(),
    private readonly adapters: AdapterSource = systemAdapters
  ) {}

  getBackup(mac: string): Promise<NetBackup | null> {
    return this.backups.read(mac)
  }

  async applyProfile(mac: string, profile: NetworkProfile): Promise<NetApplyResult> {
    const adapter = await this.requireAdapter(mac)
    validateProfile(profile)
    const prefixLength = clampPrefixLength(profile.prefixLength)

    if (await this.isAlreadyApplied(adapter, profile)) {
      return { ok: true, message: 'Profile is already applied.' }
    }

    await this.backups.captureOnce(adapter)
    const result = await this.elevated.run(applyProfileScript(mac, profile, prefixLength))
    return result.ok
      ? { ok: true, message: `${adapter.name} → ${profile.ip}/${prefixLength}` }
      : result
  }

  async setDhcp(mac: string): Promise<NetApplyResult> {
    const adapter = await this.requireAdapter(mac)
    await this.backups.captureOnce(adapter)
    const result = await this.elevated.run(dhcpScript(mac))
    return result.ok ? { ok: true, message: `${adapter.name} switched to DHCP.` } : result
  }

  /** Ilk uygulamadan onceki duruma dondurur ve yedegi siler. */
  async restoreBackup(mac: string): Promise<NetApplyResult> {
    const backup = await this.backups.read(mac)
    if (!backup) return { ok: false, message: 'There is no backup for this adapter.' }

    const result =
      backup.dhcp || !backup.ip
        ? await this.setDhcp(mac)
        : await this.applyProfile(mac, backupToProfile(mac, backup))
    if (!result.ok) return result

    await this.backups.delete(mac)
    return {
      ok: true,
      message: `Previous settings restored (${backup.dhcp ? 'DHCP' : backup.ip}).`
    }
  }

  private async requireAdapter(mac: string): Promise<AdapterInfo> {
    assertMac(mac)
    const adapter = (await this.adapters.list()).find((a) => a.mac === mac)
    if (!adapter) throw new Error('The adapter is not currently plugged in.')
    return adapter
  }

  /** Ayni ayar zaten duruyorsa ve yedek alinmissa UAC istemeye gerek yok. */
  private async isAlreadyApplied(adapter: AdapterInfo, profile: NetworkProfile): Promise<boolean> {
    if (adapter.dhcp || !adapter.ipv4.includes(profile.ip)) return false
    return (await this.backups.read(adapter.mac)) !== null
  }
}

function validateProfile(profile: NetworkProfile): void {
  assertIpv4(profile.ip, 'IP')
  if (profile.gateway) assertIpv4(profile.gateway, 'gateway')
  for (const dns of profile.dns ?? []) assertIpv4(dns, 'DNS')
}

function backupToProfile(mac: string, backup: NetBackup): NetworkProfile {
  return {
    adapterMac: mac,
    ip: backup.ip as string,
    prefixLength: backup.prefixLength ?? 24,
    gateway: backup.gateway,
    dns: backup.dns,
    autoApply: false
  }
}
