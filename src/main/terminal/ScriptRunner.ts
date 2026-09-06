import type { ScriptStep } from '@shared/types'
import type { VariableResolver } from './variableResolver'

/** Senaryonun yazdigi ve bilgi bastigi hedef (yerel kabuk veya SSH akisi). */
export interface ScriptTarget {
  write(data: string): void
  /** Ekrana bilgi satiri yazar (gri renk). */
  note(text: string): void
}

/** Sifre istemi olarak sayilan metinler (Linux, Cisco, Turkce). */
const PASSWORD_PROMPT = /(password|passphrase|şifre|sifre|parola)\s*(for [^:]+)?:\s*$/i
/** `{{secret:...}}` iceren bir gonderim sifre istemi bekler. */
const CONTAINS_SECRET = /\{\{\s*secret:/

const BUFFER_LIMIT = 8192
const DEFAULT_EXPECT_TIMEOUT = 15_000
const PASSWORD_PROMPT_TIMEOUT = 30_000
const SETTLE_TIMEOUT = 15_000
/** Cikti bu sure boyunca susarsa "duruldu" sayilir. */
const SETTLE_QUIET_MS = 800
/** Hic yanki vermeyen kabuklarda beklemeyi bu sureden sonra birak. */
const SETTLE_NO_ECHO_MS = 2000
const POLL_MS = 100

/**
 * Baglanti sonrasi otomasyon: send / expect / wait adimlarini sirayla calistirir.
 *
 * Kullanicinin expect yazmasi gerekmesin diye iki otomatik davranis var:
 *  - Bir send adimindan once (onceki adim expect/wait degilse) cikti durulana kadar beklenir.
 *  - {{secret:...}} iceren send adimi, sifre istemi ("password:" vb.) gelene kadar bekler;
 *    istem gelmezse sifre asla komut olarak gonderilmez, senaryo durur.
 */
export class ScriptRunner {
  private buffer = ''
  private waiter: { pattern: RegExp; resolve: () => void } | null = null
  private cancelled = false
  private lastDataAt = 0
  private dataCount = 0

  constructor(
    private readonly target: ScriptTarget,
    private readonly resolveVariables: VariableResolver
  ) {}

  /** Hedeften gelen her cikti parcasi buraya verilir. */
  feed(data: string): void {
    this.lastDataAt = Date.now()
    this.dataCount++
    this.buffer = (this.buffer + data).slice(-BUFFER_LIMIT)

    if (this.waiter?.pattern.test(this.buffer)) {
      const waiter = this.waiter
      this.waiter = null
      this.buffer = ''
      waiter.resolve()
    }
  }

  cancel(): void {
    this.cancelled = true
    this.waiter?.resolve()
    this.waiter = null
  }

  async run(steps: ScriptStep[]): Promise<void> {
    // Onceki adim expect/wait ise cikti zaten beklenmistir, tekrar beklenmez.
    let previousStepWaited = false

    for (const [index, step] of steps.entries()) {
      if (this.cancelled) return
      try {
        previousStepWaited = await this.runStep(step, previousStepWaited)
      } catch (e) {
        this.target.note(
          `senaryo adım ${index + 1} (${step.type}) başarısız: ${(e as Error).message}`
        )
        return
      }
    }
    if (steps.length) this.target.note('senaryo tamamlandı')
  }

  /** Adimi calistirir ve "bu adim ciktiyi bekledi mi" bilgisini dondurur. */
  private async runStep(step: ScriptStep, previousStepWaited: boolean): Promise<boolean> {
    switch (step.type) {
      case 'wait':
        await this.sleep(step.ms)
        return true
      case 'expect':
        await this.waitForPattern(
          toRegExp(step.pattern),
          step.timeoutMs ?? DEFAULT_EXPECT_TIMEOUT,
          `"${step.pattern}"`
        )
        return true
      case 'send':
        await this.send(step.text, previousStepWaited)
        return false
      case 'run':
        // Renderer `flattenSteps` ile cozer; buraya gelmesi bir hatadir.
        throw new Error(`"${step.command}" komut çağrısı çözümlenmemiş`)
    }
  }

  private async send(text: string, previousStepWaited: boolean): Promise<void> {
    if (!previousStepWaited) {
      if (CONTAINS_SECRET.test(text)) {
        // Sifre yalnizca gercek bir istem geldiginde gonderilir.
        await this.waitForPattern(
          PASSWORD_PROMPT,
          PASSWORD_PROMPT_TIMEOUT,
          'şifre istemi (password:)'
        )
      } else {
        await this.settle()
      }
    }
    if (this.cancelled) return

    const resolved = await this.resolveVariables(text)
    this.target.write(/[\r\n]$/.test(resolved) ? resolved : `${resolved}\r`)
    this.buffer = ''
  }

  private sleep(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms))
  }

  /** Cikti durulana kadar bekler: once bir veri gelsin, sonra kisa bir sessizlik olsun. */
  private async settle(): Promise<void> {
    const startedAt = Date.now()
    const countAtStart = this.dataCount

    while (!this.cancelled && Date.now() - startedAt < SETTLE_TIMEOUT) {
      const gotData = this.dataCount !== countAtStart
      if (gotData && Date.now() - this.lastDataAt >= SETTLE_QUIET_MS) return
      if (!gotData && Date.now() - startedAt >= SETTLE_NO_ECHO_MS) return
      await this.sleep(POLL_MS)
    }
  }

  private waitForPattern(pattern: RegExp, timeoutMs: number, label: string): Promise<void> {
    if (pattern.test(this.buffer)) {
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
      this.waiter = { pattern, resolve: done }
    })
  }
}

/**
 * Kullanicinin yazdigi deseni RegExp'e cevirir.
 * "(?i)" oneki JS'te gecersizdir, i bayragina cevrilir; gecersiz desen duz metin aranir.
 */
function toRegExp(pattern: string): RegExp {
  const caseInsensitive = pattern.startsWith('(?i)')
  const source = caseInsensitive ? pattern.slice(4) : pattern
  const flags = caseInsensitive ? 'i' : ''
  try {
    return new RegExp(source, flags)
  } catch {
    return new RegExp(source.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), flags)
  }
}
