import { app } from 'electron'
import { appendFileSync } from 'fs'
import { join } from 'path'

/**
 * Tani logu sozlesmesi. Log yazan moduller dosya sistemine degil bu arayuze bakar,
 * boylece test icin bellekte tutan bir Logger takilabilir (DIP).
 */
export interface Logger {
  log(...parts: unknown[]): void
}

function formatLine(parts: unknown[]): string {
  const body = parts.map((p) => (typeof p === 'string' ? p : JSON.stringify(p))).join(' ')
  return `${new Date().toISOString()} ${body}\n`
}

/** %APPDATA%/termino/termino.log dosyasina ekler. Yazilamazsa uygulama durmaz. */
export class FileLogger implements Logger {
  log(...parts: unknown[]): void {
    try {
      appendFileSync(join(app.getPath('userData'), 'termino.log'), formatLine(parts))
    } catch {
      /* log yazilamamasi kullaniciyi ilgilendirmez */
    }
  }
}

/** Hicbir sey yazmayan logger; testlerde ve log istenmeyen yerlerde kullanilir. */
export class NullLogger implements Logger {
  log(): void {
    /* bilerek bos */
  }
}

/**
 * Bir async islemin basini, sonucunu ve hatasini loglar; sonucu oldugu gibi dondurur.
 * IPC islemlerini tek tek try/catch ile sarmalamak yerine bu kullanilir.
 */
export async function logged<T>(
  logger: Logger,
  name: string,
  operation: () => Promise<T>
): Promise<T> {
  logger.log(name, 'start')
  try {
    const result = await operation()
    logger.log(name, 'done', result)
    return result
  } catch (e) {
    logger.log(name, 'error', String((e as Error).message ?? e))
    throw e
  }
}
