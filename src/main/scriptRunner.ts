import type { ScriptStep } from '@shared/types'

export interface ScriptTarget {
  write(data: string): void
  /** Ekrana bilgi satiri yazar (gri renk). */
  note(text: string): void
}

/** Sifre istemi olarak sayilan metinler (Linux, Cisco, Turkce) */
const PASSWORD_PROMPT = /(password|passphrase|şifre|sifre|parola)\s*(for [^:]+)?:\s*$/i

/**
 * Baglanti sonrasi otomasyon: send / expect / wait adimlarini sirayla calistirir.
 *
 * Kullanicinin expect yazmasi gerekmesin diye iki otomatik davranis var:
 *  - Bir send adimindan once (onceki adim expect degilse) cikti durulana kadar beklenir
 *    (son veriden sonra ~800 ms sessizlik, en fazla 15 s).
 *  - {{secret:...}} iceren send adimi, sifre istemi ("password:" vb.) gelene kadar bekler;
 *    istem gelmezse sifre asla komut olarak gonderilmez, senaryo durur.
 */
export class ScriptRunner {
  private buffer = ''
  private waiter: { re: RegExp; resolve: () => void } | null = null
  private cancelled = false
  private lastDataAt = 0
  private dataSeq = 0

  constructor(
    private target: ScriptTarget,
    private resolveVars: (text: string) => Promise<string>
  ) {}

  feed(data: string): void {
    this.lastDataAt = Date.now()
    this.dataSeq++
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
    let prevWasSync = false // onceki adim expect/wait ise tekrar beklemeye gerek yok
    for (const [i, step] of steps.entries()) {
      if (this.cancelled) return
      try {
        if (step.type === 'wait') {
          await this.sleep(step.ms)
          prevWasSync = true
        } else if (step.type === 'expect') {
          await this.expect(step.pattern, step.timeoutMs ?? 15000)
          prevWasSync = true
        } else if (step.type === 'send') {
          const isSecret = /\{\{\s*secret:/.test(step.text)
          if (isSecret) {
            if (!prevWasSync) await this.expectPasswordPrompt(30000)
          } else if (!prevWasSync) {
            await this.settle(15000)
          }
          if (this.cancelled) return
          const text = await this.resolveVars(step.text)
          this.target.write(text.endsWith('\r') || text.endsWith('\n') ? text : text + '\r')
          this.buffer = ''
          prevWasSync = false
        }
      } catch (e) {
        this.target.note(`senaryo adım ${i + 1} (${step.type}) başarısız: ${(e as Error).message}`)
        return
      }
    }
    if (steps.length) this.target.note('senaryo tamamlandı')
  }

  private sleep(ms: number): Promise<void> {
    return new Promise((r) => setTimeout(r, ms))
  }

  /** Cikti durulana kadar bekler: son veriden sonra quietMs sessizlik veya maxMs doldu. */
  private async settle(maxMs: number, quietMs = 800): Promise<void> {
    const start = Date.now()
    const seqAtStart = this.dataSeq
    // Once en az bir veri gelsin (komut yankisi/istem), sonra sessizlik ara.
    while (!this.cancelled && Date.now() - start < maxMs) {
      const gotData = this.dataSeq !== seqAtStart
      const quiet = Date.now() - this.lastDataAt >= quietMs
      if (gotData && quiet) return
      // Hic veri gelmiyorsa 2 s sonra yine de devam et (bazi kabuklar yanki vermez).
      if (!gotData && Date.now() - start >= 2000) return
      await this.sleep(100)
    }
  }

  private expectPasswordPrompt(timeoutMs: number): Promise<void> {
    if (PASSWORD_PROMPT.test(this.buffer.trimEnd() + ':')) {
      // Buffer zaten bir sifre istemiyle bitiyorsa hemen devam.
      if (PASSWORD_PROMPT.test(this.buffer.replace(/\s+$/, ''))) {
        this.buffer = ''
        return Promise.resolve()
      }
    }
    return this.waitFor(PASSWORD_PROMPT, timeoutMs, 'şifre istemi (password:)')
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
    return this.waitFor(re, timeoutMs, `"${pattern}"`)
  }

  private waitFor(re: RegExp, timeoutMs: number, label: string): Promise<void> {
    if (re.test(this.buffer)) {
      this.buffer = ''
      return Promise.resolve()
    }
    return new Promise<void>((resolve, reject) => {
      const timer = setTimeout(() => {
        if (this.waiter?.resolve === done) this.waiter = null
        reject(new Error(`${label} ${timeoutMs} ms içinde gelmedi`))
      }, timeoutMs)
      const done = (): void => {
        clearTimeout(timer)
        resolve()
      }
      this.waiter = { re, resolve: done }
    })
  }
}
