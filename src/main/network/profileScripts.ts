import type { NetworkProfile } from '@shared/types'
import { psQuote } from './powershell'

/**
 * Ag islemlerinin PowerShell metinleri tek yerde toplanir; calistirma
 * (`powershell.ts`, `elevated.ts`) ve karar mantigi (`NetworkConfigurator`) ayridir.
 */

/** $a = adaptor, $idx = arayuz indeksi. Diger parcalar bu degiskenleri bekler. */
export function adapterLookup(mac: string): string {
  return [
    `$a = Get-NetAdapter | Where-Object MacAddress -eq '${psQuote(mac)}' | Select-Object -First 1`,
    `if (-not $a) { throw 'Adaptör bulunamadı: ${psQuote(mac)}' }`,
    '$idx = $a.ifIndex'
  ].join('\n')
}

/** Elle atanmis IPv4 adreslerini ve varsayilan gecidi temizler. */
export function clearIpv4(): string {
  return [
    "Get-NetRoute -InterfaceIndex $idx -AddressFamily IPv4 -DestinationPrefix '0.0.0.0/0' -ErrorAction SilentlyContinue | Remove-NetRoute -Confirm:$false -ErrorAction SilentlyContinue",
    'Get-NetIPAddress -InterfaceIndex $idx -AddressFamily IPv4 -ErrorAction SilentlyContinue | Where-Object PrefixOrigin -ne WellKnown | Remove-NetIPAddress -Confirm:$false -ErrorAction SilentlyContinue'
  ].join('\n')
}

/** Adaptorun mevcut IPv4 durumunu JSON olarak yazdirir (yonetici gerekmez). */
export function readStateScript(mac: string): string {
  return [
    "$ErrorActionPreference = 'SilentlyContinue'",
    `$a = Get-NetAdapter | Where-Object MacAddress -eq '${psQuote(mac)}' | Select-Object -First 1`,
    '$ip = Get-NetIPAddress -InterfaceIndex $a.ifIndex -AddressFamily IPv4 | Where-Object PrefixOrigin -ne WellKnown | Select-Object -First 1',
    "$gw = (Get-NetRoute -InterfaceIndex $a.ifIndex -DestinationPrefix '0.0.0.0/0' | Select-Object -First 1).NextHop",
    '$dns = @((Get-DnsClientServerAddress -InterfaceIndex $a.ifIndex -AddressFamily IPv4).ServerAddresses)',
    '$dhcp = (Get-NetIPInterface -InterfaceIndex $a.ifIndex -AddressFamily IPv4).Dhcp -eq "Enabled"',
    '[pscustomobject]@{ dhcp=$dhcp; ip=$ip.IPAddress; prefixLength=$ip.PrefixLength; gateway=$gw; dns=$dns } | ConvertTo-Json -Compress'
  ].join('\n')
}

/** Statik profili uygular (yonetici gerektirir). */
export function applyProfileScript(
  mac: string,
  profile: NetworkProfile,
  prefixLength: number
): string {
  const gateway = profile.gateway ? ` -DefaultGateway '${psQuote(profile.gateway)}'` : ''
  const dns = profile.dns ?? []
  return [
    adapterLookup(mac),
    'Set-NetIPInterface -InterfaceIndex $idx -AddressFamily IPv4 -Dhcp Disabled',
    clearIpv4(),
    `New-NetIPAddress -InterfaceIndex $idx -IPAddress '${psQuote(profile.ip)}' -PrefixLength ${prefixLength}${gateway} | Out-Null`,
    dns.length
      ? `Set-DnsClientServerAddress -InterfaceIndex $idx -ServerAddresses @(${dns
          .map((d) => `'${psQuote(d)}'`)
          .join(',')})`
      : 'Set-DnsClientServerAddress -InterfaceIndex $idx -ResetServerAddresses'
  ].join('\n')
}

/** Adaptoru DHCP'ye alir (yonetici gerektirir). */
export function dhcpScript(mac: string): string {
  return [
    adapterLookup(mac),
    clearIpv4(),
    'Set-NetIPInterface -InterfaceIndex $idx -AddressFamily IPv4 -Dhcp Enabled',
    'Set-DnsClientServerAddress -InterfaceIndex $idx -ResetServerAddresses',
    'Restart-NetAdapter -InputObject $a -Confirm:$false -ErrorAction SilentlyContinue'
  ].join('\n')
}
