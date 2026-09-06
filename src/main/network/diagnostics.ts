import type { AdapterInfo } from '@shared/types'
import type { NetContext } from '@shared/ipc'
import { systemAdapters, type AdapterSource } from './adapters'
import { isLinkLocal, looksLikeIpv4, sameSubnet } from './validation'

/** Otomatik yapilandirma adresleri gercek baglanti sayilmaz. */
function realIps(adapter: AdapterInfo): string[] {
  return adapter.ipv4.filter((ip) => !isLinkLocal(ip))
}

function isConnected(adapter: AdapterInfo): boolean {
  return adapter.status === 'Up' && realIps(adapter).length > 0
}

/**
 * Baglanti oncesi ag teshisi: "neden ulasamiyorum" sorusunun cevabini uretir.
 * Bos liste = gorunur bir sorun yok.
 */
export async function diagnoseNetwork(
  host: string,
  net?: NetContext,
  source: AdapterSource = systemAdapters
): Promise<string[]> {
  let adapters: AdapterInfo[]
  try {
    adapters = await source.list()
  } catch {
    return [] // adaptorler okunamiyorsa teshis yerine sessiz kal
  }

  const warnings: string[] = []
  if (!adapters.some(isConnected)) warnings.push('No network adapter appears to be connected.')

  if (net?.adapterMac) {
    warnings.push(...checkBoundAdapter(host, net, adapters))
  } else if (looksLikeIpv4(host)) {
    warnings.push(...checkAnyRoute(host, adapters))
  }
  return warnings
}

/** Projenin profiline bagli adaptor: takili mi, IP'si var mi, profil uygulanmis mi? */
function checkBoundAdapter(host: string, net: NetContext, adapters: AdapterInfo[]): string[] {
  const adapter = adapters.find((a) => a.mac === net.adapterMac)
  if (!adapter) return ['The adapter bound to the project network profile is not plugged in.']

  if (adapter.status !== 'Up') {
    const reason = adapter.status === 'Disconnected' ? 'cable not connected' : adapter.status
    return [`Adapter "${adapter.name}" has no link (${reason}).`]
  }

  const warnings: string[] = []
  const ips = realIps(adapter)
  if (ips.length === 0) {
    const cause = adapter.dhcp ? ' (DHCP did not respond)' : ''
    warnings.push(
      `Adapter "${adapter.name}" has no IP address${cause}. Apply the profile from the Network tab.`
    )
  } else if (net.ip && !adapter.ipv4.includes(net.ip)) {
    warnings.push(
      `Profile IP (${net.ip}) has not been applied to the adapter; it currently has ${ips.join(', ')}. Use "Apply profile" in the Network tab.`
    )
  }

  const hostOutOfSubnet =
    looksLikeIpv4(host) &&
    net.ip &&
    looksLikeIpv4(net.ip) &&
    !sameSubnet(host, net.ip, net.prefixLength)
  if (hostOutOfSubnet) {
    warnings.push(`Target ${host} is not in the profile subnet (${net.ip}/${net.prefixLength}).`)
  }
  return warnings
}

/** Profil yoksa: hedefle ayni alt agda bagli herhangi bir adaptor var mi? */
function checkAnyRoute(host: string, adapters: AdapterInfo[]): string[] {
  if (host.startsWith('127.')) return []
  const reachable = adapters.some(
    (a) => a.status === 'Up' && realIps(a).some((ip) => sameSubnet(ip, host, 24))
  )
  return reachable
    ? []
    : [
        `No connected adapter appears to be in the same subnet as target ${host}. You can define and apply a profile from the Network tab.`
      ]
}

/** ssh2 hata metnini kullaniciya anlamli Turkce mesaja cevirir. */
export function explainSshError(message: string, host: string, port: number): string {
  const lower = message.toLowerCase()
  const match = SSH_ERROR_RULES.find((rule) => rule.keywords.some((k) => lower.includes(k)))
  return match ? match.explain(host, port) : message
}

const SSH_ERROR_RULES: {
  keywords: string[]
  explain: (host: string, port: number) => string
}[] = [
  {
    keywords: ['timed out', 'etimedout'],
    explain: (host, port) =>
      `Could not reach the device: ${host}:${port} timed out. Check the cable, the IP settings, and whether the device is powered on.`
  },
  {
    keywords: ['econnrefused'],
    explain: (host, port) =>
      `${host} responded, but there is no SSH service on port ${port} (connection refused).`
  },
  {
    keywords: ['ehostunreach', 'enetunreach'],
    explain: (host) =>
      `There is no route to ${host} (host unreachable). Check the IP/subnet settings.`
  },
  {
    keywords: ['authentication', 'all configured authentication methods failed'],
    explain: () => 'Authentication failed: the username or password was rejected.'
  },
  {
    keywords: ['enotfound', 'getaddrinfo'],
    explain: (host) => `Could not resolve host name: ${host}`
  },
  {
    keywords: ['econnreset'],
    explain: () => 'The connection was closed by the remote side (ECONNRESET).'
  }
]
