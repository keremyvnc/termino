// IPv4 yardimcilari. Main (dogrulama, teshis) ve renderer (form, maske gosterimi)
// ayni tanimlari kullanir; kural iki yerde ayri ayri yazilmaz.

/** Tam dogrulama: her sekizli 0-255 araliginda. */
const STRICT_IPV4 = /^(25[0-5]|2[0-4]\d|1?\d?\d)(\.(25[0-5]|2[0-4]\d|1?\d?\d)){3}$/
/** Gevsek kontrol: "IP mi yoksa sunucu adi mi" ayrimi icin yeterli. */
const LOOSE_IPV4 = /^\d{1,3}(\.\d{1,3}){3}$/
const MAC = /^([0-9A-Fa-f]{2}-){5}[0-9A-Fa-f]{2}$/

export function isIpv4(value: string): boolean {
  return STRICT_IPV4.test(value)
}

/** Adres bir IP gibi mi goruniyor (dogrulugu degil, bicimi sorulur). */
export function looksLikeIpv4(value: string): boolean {
  return LOOSE_IPV4.test(value)
}

export function isMac(value: string): boolean {
  return MAC.test(value)
}

/** Prefix uzunlugunu gecerli aralikta tam sayiya sabitler. */
export function clampPrefixLength(prefix: number): number {
  return Math.min(32, Math.max(1, Math.floor(prefix)))
}

/** 24 -> "255.255.255.0" */
export function prefixToMask(prefixLength: number): string {
  const bits = prefixLength <= 0 ? 0 : (0xffffffff << (32 - prefixLength)) >>> 0
  return [24, 16, 8, 0].map((shift) => (bits >>> shift) & 255).join('.')
}

/** Otomatik yapilandirma (APIPA) adresi gercek bir baglanti sayilmaz. */
export function isLinkLocal(ip: string): boolean {
  return ip.startsWith('169.254.')
}

/** Iki adres ayni alt agda mi? */
export function sameSubnet(a: string, b: string, prefixLength: number): boolean {
  if (prefixLength <= 0) return true
  const mask = prefixLength >= 32 ? 0xffffffff : (0xffffffff << (32 - prefixLength)) >>> 0
  return (ipToInt(a) & mask) === (ipToInt(b) & mask)
}

function ipToInt(ip: string): number {
  return ip.split('.').reduce((acc, octet) => ((acc << 8) + (Number(octet) & 255)) >>> 0, 0)
}
