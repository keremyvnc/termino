import type { ScriptStep } from '@shared/types'
import { ScriptRunner, type ScriptTarget } from './ScriptRunner'
import type { VariableResolver } from './variableResolver'

/**
 * Bir oturumda senaryolari sirayla calistirir: baglanti sonrasi senaryo,
 * ardindan kullanicinin calistirdigi komut dosyalari. Oturum `ready()`
 * denene kadar hicbiri baslamaz; ayni anda tek senaryo calisir.
 */
export class ScriptQueue {
  private current: ScriptRunner | null = null
  private chain: Promise<void>
  private markReady!: () => void
  private cancelled = false

  constructor(
    private readonly target: ScriptTarget,
    private readonly resolveVariables: VariableResolver
  ) {
    this.chain = new Promise<void>((resolve) => (this.markReady = resolve))
  }

  /** Oturum yazmaya hazir (kabuk acildi). */
  ready(): void {
    this.markReady()
  }

  /** Oturumdan gelen cikti; calisan senaryo varsa ona verilir. */
  feed(data: string): void {
    this.current?.feed(data)
  }

  run(steps: ScriptStep[]): Promise<void> {
    if (!steps.length) return Promise.resolve()
    const next = this.chain.then(async () => {
      if (this.cancelled) return
      this.current = new ScriptRunner(this.target, this.resolveVariables)
      try {
        await this.current.run(steps)
      } finally {
        this.current = null
      }
    })
    // Bir senaryo hata verse bile sonrakiler calisabilsin.
    this.chain = next.catch(() => undefined)
    return next
  }

  cancel(): void {
    this.cancelled = true
    this.current?.cancel()
  }
}
