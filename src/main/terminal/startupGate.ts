/**
 * Kabuk acilisindaki ciktiyi (profil mesajlari, hatalar) ekrana vermeden tutar.
 * PowerShell `Clear-Host` ile ekrani temizleyince (ESC[3J) kapi acilir; o ana kadar
 * biriken metin ekrana hic gitmez, yalnizca loga yazilir. Boylece kullanici
 * "bir an gorunup silinen" hata gormez. Temizleme hic gelmezse zaman asiminda
 * biriken her sey oldugu gibi aktarilir (hicbir sey kaybolmaz).
 */

/** Clear-Host'un gonderdigi kaydirma gecmisini silme dizisi. */
const CLEAR_SCROLLBACK = '\x1b[3J'
/** Kapi acilinca ekrana gonderilen temiz baslangic. */
const RESET_SCREEN = '\x1b[2J\x1b[3J\x1b[H'

export interface StartupGateOptions {
  /** Ekrana gidecek veri. */
  emit(data: string): void
  /** Gizlenen, anlamli (ANSI'siz, bos olmayan) acilis metni. */
  onDiscard?(text: string): void
  timeoutMs?: number
}

export interface StartupGate {
  feed(data: string): void
}

export function createStartupGate({
  emit,
  onDiscard,
  timeoutMs = 4000
}: StartupGateOptions): StartupGate {
  let open = false
  let buffer = ''
  const timer = setTimeout(() => {
    if (open) return
    open = true
    emit(buffer)
    buffer = ''
  }, timeoutMs)

  return {
    feed(data) {
      if (open) {
        emit(data)
        return
      }
      buffer += data
      const at = buffer.indexOf(CLEAR_SCROLLBACK)
      if (at < 0) return
      clearTimeout(timer)
      open = true
      const hidden = stripAnsi(buffer.slice(0, at)).trim()
      if (hidden && onDiscard) onDiscard(hidden)
      // Temizleme dizisinin gerisi (imlec konumu, istem) oldugu gibi gider.
      const rest = buffer.slice(at + CLEAR_SCROLLBACK.length)
      buffer = ''
      emit(RESET_SCREEN + rest)
    }
  }
}

/** Kacis dizilerini atip yalnizca okunur metni birakir. */
export function stripAnsi(text: string): string {
  return text
    .replace(/\x1b\][^\x07]*\x07/g, '')
    .replace(/\x1b\[[0-9;?]*[A-Za-z]/g, '')
    .replace(/\r/g, '')
    .replace(/\n{2,}/g, '\n')
}
