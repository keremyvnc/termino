import type { AdapterInfo } from '@shared/types'
import type { NetContext } from '@shared/ipc'
import { listAdapters } from './network'

function ipToInt(ip: string): number {
  return ip.split('.').reduce((acc, o) => ((acc << 8) + (Number(o) & 255)) >>> 0, 0)
}

function sameSubnet(a: string, b: string, prefix: number): boolean {
  if (prefix <= 0) return true
  const mask = prefix >= 32 ? 0xffffffff : (0xffffffff << (32 - prefix)) >>> 0
  return (ipToInt(a) & mask) === (ipToInt(b) & mask)
}

const IP_RE = /^\d{1,3}(\.\d{1,3}){3}$/

/**
 * Baglanti oncesi ag teshisi. Kullaniciya "neden ulasamiyorum" sorusunun
 * cevabini verecek uyarilar uretir; bos liste = gorunur bir sorun yok.
 */
export async function diagnoseNetwork(host: string, net?: NetContext): Promise<string[]> {
  const warnings: string[] = []
  let adapters: AdapterInfo[] = []
  try {
    adapters = await listAdapters()
  } catch {
    return warnings
  }

  const hostIsIp = IP_RE.test(host)
  const anyUp = adapters.some((a) => a.status === 'Up' && a.ipv4.some((ip) => !ip.startsWith('169.254.')))
  if (!anyUp) warnings.push('Hiçbir ağ adaptörü bağlı görünmüyor.')

  if (net?.adapterMac) {
    const a = adapters.find((x) => x.mac === net.adapterMac)
    if (!a) {
      warnings.push('Projenin ağ profiline bağlı adaptör takılı değil.')
    } else if (a.status !== 'Up') {
      warnings.push(
        `"${a.name}" adaptöründe bağlantı yok (${a.status === 'Disconnected' ? 'kablo takılı değil' : a.status}).`
      )
    } else {
      const real = a.ipv4.filter((ip) => !ip.startsWith('169.254.'))
      if (real.length === 0) {
        warnings.push(`"${a.name}" adaptörünün IP adresi yok${a.dhcp ? ' (DHCP cevap vermedi)' : ''}. Ağ sekmesinden profili uygula.`)
      } else if (net.ip && !a.ipv4.includes(net.ip)) {
        warnings.push(
          `Profil IP'si (${net.ip}) adaptöre uygulanmamış; adaptör şu an ${real.join(', ')}. Ağ sekmesinden "Profili uygula".`
        )
      }
      if (hostIsIp && net.ip && IP_RE.test(net.ip) && !sameSubnet(host, net.ip, net.prefixLength)) {
        warnings.push(`Hedef ${host}, profil alt ağında (${net.ip}/${net.prefixLength}) değil.`)
      }
    }
  } else if (hostIsIp) {
    // Profil yoksa: hedefle ayni alt agda herhangi bir adaptor var mi?
    const reachable = adapters.some(
      (a) => a.status === 'Up' && a.ipv4.some((ip) => !ip.startsWith('169.254.') && sameSubnet(ip, host, 24))
    )
    if (!reachable && !host.startsWith('127.')) {
      warnings.push(`Hedef ${host} ile aynı alt ağda bağlı bir adaptör görünmüyor. Ağ sekmesinden bir profil tanımlayıp uygulayabilirsin.`)
    }
  }
  return warnings
}

/** ssh2 hata metnini kullaniciya anlamli Turkce mesaja cevirir. */
export function explainSshError(message: string, host: string, port: number): string {
  const m = message.toLowerCase()
  if (m.includes('timed out') || m.includes('etimedout')) {
    return `Cihaza ulaşılamadı: ${host}:${port} zaman aşımı. Kablo, IP ayarı veya cihazın açık olup olmadığını kontrol et.`
  }
  if (m.includes('econnrefused')) return `${host} cevap verdi ama ${port} portunda SSH servisi yok (bağlantı reddedildi).`
  if (m.includes('ehostunreach') || m.includes('enetunreach')) return `${host} adresine giden bir yol yok (host unreachable). IP/alt ağ ayarını kontrol et.`
  if (m.includes('authentication') || m.includes('all configured authentication methods failed')) {
    return 'Kimlik doğrulama başarısız: kullanıcı adı veya şifre reddedildi.'
  }
  if (m.includes('enotfound') || m.includes('getaddrinfo')) return `Sunucu adı çözümlenemedi: ${host}`
  if (m.includes('econnreset')) return 'Bağlantı karşı taraf tarafından kapatıldı (ECONNRESET).'
  return message
}
