import type { AdapterInfo, NetworkProfile } from '@shared/types'
import { isIpv4 } from '@shared/net'

/** Formdaki her alanin gecerliligi. Butonlarin durumu buradan okunur. */
export interface ProfileValidity {
  ip: boolean
  gateway: boolean
  dns: boolean
  all: boolean
}

export function validateProfile(profile: NetworkProfile): ProfileValidity {
  const ip = isIpv4(profile.ip)
  const gateway = !profile.gateway || isIpv4(profile.gateway)
  const dns = (profile.dns ?? []).every(isIpv4)
  return { ip, gateway, dns, all: ip && gateway && dns }
}

/** Profil adaptorde su an duruyor mu? */
export function isProfileApplied(
  adapter: AdapterInfo | undefined,
  profile: NetworkProfile
): boolean {
  return Boolean(adapter && !adapter.dhcp && adapter.ipv4.includes(profile.ip))
}

/** "Error invoking remote method ..." on ekini atip mesaji okunur hale getirir. */
export function toReadableError(e: unknown): string {
  return String((e as Error).message ?? e).replace(
    /^Error invoking remote method '[^']+': Error: /,
    ''
  )
}
