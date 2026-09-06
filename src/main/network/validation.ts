import { isIpv4, isMac } from '@shared/net'

// Ortak IPv4 kurallari `@shared/net` icindedir; burada yalnizca main tarafinin
// ihtiyac duydugu "gecersizse hata firlat" sarmallari bulunur.
export {
  clampPrefixLength,
  isIpv4,
  isLinkLocal,
  looksLikeIpv4,
  prefixToMask,
  sameSubnet
} from '@shared/net'

export function assertIpv4(value: string, label: string): void {
  if (!isIpv4(value)) throw new Error(`Invalid ${label}: ${value}`)
}

export function assertMac(value: string): void {
  if (!isMac(value)) throw new Error(`Invalid MAC address: ${value}`)
}
