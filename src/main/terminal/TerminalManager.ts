import type { TermCreateOptions, TermExitInfo } from '@shared/ipc'
import type { ScriptStep } from '@shared/types'
import type { SecretReader } from '../credentials'
import { createDefaultSessionFactories } from './sessionFactories'
import type {
  SessionFactory,
  SessionFactoryRegistry,
  SessionHooks,
  TerminalSession
} from './TerminalSession'

/**
 * Oturum olaylarinin gidecegi yer. Yonetici Electron'u ve IPC kanal adlarini
 * bilmez; bunlari bu arayuzun uygulamasi bilir (DIP).
 */
export interface TerminalEventSink {
  data(id: string, data: string): void
  exit(info: TermExitInfo): void
}

/**
 * Acik oturumlarin defteri: olusturur, yonlendirir, kapatir.
 * Oturumlarin nasil kuruldugunu bilmez; bunu ureticiler bilir (OCP).
 */
export class TerminalManager {
  private readonly sessions = new Map<string, TerminalSession>()

  constructor(
    private readonly events: TerminalEventSink,
    private readonly secrets: SecretReader,
    private readonly factories: SessionFactoryRegistry = createDefaultSessionFactories()
  ) {}

  /** Yeni bir terminal turu tanitir. */
  register(kind: string, factory: SessionFactory): void {
    this.factories.set(kind, factory)
  }

  create(options: TermCreateOptions): string {
    const id = options.id
    if (this.sessions.has(id)) throw new Error(`Terminal already exists: ${id}`)

    const factory = this.factories.get(options.kind)
    if (!factory) throw new Error(`Unsupported terminal type: ${options.kind}`)

    this.sessions.set(id, factory({ id, options, hooks: this.hooksFor(id), secrets: this.secrets }))
    return id
  }

  write(id: string, data: string): void {
    this.sessions.get(id)?.write(data)
  }

  resize(id: string, cols: number, rows: number): void {
    this.sessions.get(id)?.resize(cols, rows)
  }

  kill(id: string): void {
    this.sessions.get(id)?.kill()
    this.sessions.delete(id)
  }

  /** Komut dosyasinin adimlarini acik bir oturumda calistirir. */
  async runScript(id: string, steps: ScriptStep[]): Promise<void> {
    const session = this.sessions.get(id)
    if (!session) throw new Error('Session is not open')
    await session.runScript(steps)
  }

  killAll(): void {
    for (const session of this.sessions.values()) session.kill()
    this.sessions.clear()
  }

  private hooksFor(id: string): SessionHooks {
    return {
      onData: (data) => this.events.data(id, data),
      onExit: (info) => {
        this.sessions.delete(id)
        this.events.exit(info)
      }
    }
  }
}
