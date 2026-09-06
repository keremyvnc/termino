/** Terminale basilan uygulama mesajlarinin bicimi tek yerde tutulur. */

const RESET = '\x1b[0m'
const PREFIX = '[termino] '

/** Uyari (sari), satir basina eklenmez: baglanti sirasinda akisa karisir. */
export function warning(text: string): string {
  return `\x1b[33m${PREFIX}${text}${RESET}\r\n`
}

/** Bilgi satiri (gri); onceki ciktidan bos satirla ayrilir. */
export function note(text: string): string {
  return `\r\n\x1b[90m${PREFIX}${text}${RESET}\r\n`
}

/** Hata satiri (kirmizi); onceki ciktidan bos satirla ayrilir. */
export function failure(text: string): string {
  return `\r\n\x1b[31m${PREFIX}${text}${RESET}\r\n`
}

/** Sonik durum metni (gri), termino oneki olmadan. */
export function dim(text: string): string {
  return `\x1b[90m${text}${RESET}\r\n`
}
