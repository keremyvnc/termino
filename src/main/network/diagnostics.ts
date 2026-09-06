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
  if (!adapters.some(isConnected)) warnings.push('Hiçbir ağ adaptörü bağlı görünmüyor.')

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
  if (!adapter) return ['Projenin ağ profiline bağlı adaptör takılı değil.']

  if (adapter.status !== 'Up') {
    const reason = adapter.status === 'Disconnected' ? 'kablo takılı değil' : adapter.status
    return [`"${adapter.name}" adaptöründe bağlantı yok (${reason}).`]
  }

  const warnings: string[] = []
  const ips = realIps(adapter)
  if (ips.length === 0) {
    const cause = adapter.dhcp ? ' (DHCP cevap vermedi)' : ''
    warnings.push(
      `"${adapter.name}" adaptörünün IP adresi yok${cause}. Ağ sekmesinden profili uygula.`
    )
  } else if (net.ip && !adapter.ipv4.includes(net.ip)) {
    warnings.push(
      `Profil IP'si (${net.ip}) adaptöre uygulanmamış; adaptör şu an ${ips.join(', ')}. Ağ sekmesinden "Profili uygula".`
    )
  }

  const hostOutOfSubnet =
    looksLikeIpv4(host) &&
    net.ip &&
    looksLikeIpv4(net.ip) &&
    !sameSubnet(host, net.ip, net.prefixLength)
  if (hostOutOfSubnet) {
    warnings.push(`Hedef ${host}, profil alt ağında (${net.ip}/${net.prefixLength}) değil.`)
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
        `Hedef ${host} ile aynı alt ağda bağlı bir adaptör görünmüyor. Ağ sekmesinden bir profil tanımlayıp uygulayabilirsin.`
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
      `Cihaza ulaşılamadı: ${host}:${port} zaman aşımı. Kablo, IP ayarı veya cihazın açık olup olmadığını kontrol et.`
  },
  {
    keywords: ['econnrefused'],
    explain: (host, port) =>
      `${host} cevap verdi ama ${port} portunda SSH servisi yok (bağlantı reddedildi).`
  },
  {
    keywords: ['ehostunreach', 'enetunreach'],
    explain: (host) =>
      `${host} adresine giden bir yol yok (host unreachable). IP/alt ağ ayarını kontrol et.`
  },
  {
    keywords: ['authentication', 'all configured authentication methods failed'],
    explain: () => 'Kimlik doğrulama başarısız: kullanıcı adı veya şifre reddedildi.'
  },
  {
    keywords: ['enotfound', 'getaddrinfo'],
    explain: (host) => `Sunucu adı çözümlenemedi: ${host}`
  },
  {
    keywords: ['econnreset'],
    explain: () => 'Bağlantı karşı taraf tarafından kapatıldı (ECONNRESET).'
  }
]
