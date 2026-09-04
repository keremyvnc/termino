import type { ScriptStep } from '@shared/types'

export interface ScriptTarget {
  write(data: string): void
  /** Ekrana bilgi satiri yazar (gri renk). */
  note(text: string): void
}

/**
 * Baglanti sonrasi otomasyon: send / expect / wait adimlarini sirayla calistirir.
 * Gelen veri feed() ile beslenir; expect regex'i son 8 KB cikti uzerinde aranir.
 */
export class ScriptRunner {
  private buffer = ''
  private waiter: { re: RegExp; resolve: () => void } | null = null
  private cancelled = false

  constructor(
    private target: ScriptTarget,
    private resolveVars: (text: string) => Promise<string>
  ) {}

  feed(data: string): void {
    this.buffer = (this.buffer + data).slice(-8192)
    if (this.waiter && this.waiter.re.test(this.buffer)) {
      const w = this.waiter
      this.waiter = null
      this.buffer = ''
      w.resolve()
    }
  }

  cancel(): void {
    this.cancelled = true
    this.waiter?.resolve()
    this.waiter = null
  }

  async run(steps: ScriptStep[]): Promise<void> {
    for (const [i, step] of steps.entries()) {
      if (this.cancelled) return
      try {
        if (step.type === 'wait') {
          await new Promise((r) => setTimeout(r, step.ms))
        } else if (step.type === 'send') {
          const text = await this.resolveVars(step.text)
          this.target.write(text.endsWith('\r') || text.endsWith('\n') ? text : text + '\r')
        } else if (step.type === 'expect') {
          await this.expect(step.pattern, step.timeoutMs ?? 15000)
        }
      } catch (e) {
        this.target.note(`senaryo adım ${i + 1} (${step.type}) başarısız: ${(e as Error).message}`)
        return
      }
    }
    if (steps.length) this.target.note('senaryo tamamlandı')
  }

  private expect(pattern: string, timeoutMs: number): Promise<void> {
    // "(?i)" oneki JS'te gecersiz; onu i bayragina cevir. Gecersiz regex ise duz metin ara.
    let flags = ''
    let src = pattern
    if (src.startsWith('(?i)')) {
      flags = 'i'
      src = src.slice(4)
    }
    let re: RegExp
    try {
      re = new RegExp(src, flags)
    } catch {
      re = new RegExp(src.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), flags)
    }
    if (re.test(this.buffer)) {
      this.buffer = ''
      return Promise.resolve()
    }
    return new Promise<void>((resolve, reject) => {
      const timer = setTimeout(() => {
        if (this.waiter?.resolve === done) this.waiter = null
        reject(new Error(`"${pattern}" ${timeoutMs} ms içinde gelmedi`))
      }, timeoutMs)
      const done = (): void => {
        clearTimeout(timer)
        resolve()
      }
      this.waiter = { re, resolve: done }
    })
  }
}
