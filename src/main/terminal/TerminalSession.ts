import type { TermCreateOptions, TermExitInfo } from '@shared/ipc'
import type { ScriptStep } from '@shared/types'
import type { SecretReader } from '../credentials'

/**
 * Terminal saglayici arayuzu. local (node-pty) ve ssh (ssh2) bunu uygular;
 * serial/telnet gibi yeni turler de ayni arayuzu uygulayip kayit edilir.
 */
export interface TerminalSession {
  readonly id: string
  write(data: string): void
  resize(cols: number, rows: number): void
  kill(): void
  /**
   * Senaryo adimlarini bu oturumda calistirir. Onceki senaryo (ornegin baglanti
   * sonrasi olan) bitmeden baslamaz; oturum henuz hazir degilse kuyruga girer.
   */
  runScript(steps: ScriptStep[]): Promise<void>
}

/** Oturumun disari haber verme yollari. */
export interface SessionHooks {
  onData(data: string): void
  onExit(info: TermExitInfo): void
}

/** Bir oturumu kurmak icin gereken her sey. */
export interface SessionContext {
  id: string
  options: TermCreateOptions
  hooks: SessionHooks
  secrets: SecretReader
}

/**
 * Oturum uretici. Yeni bir terminal turu eklemek icin TerminalManager degistirilmez,
 * yalnizca yeni bir uretici kaydedilir (OCP).
 */
export type SessionFactory = (context: SessionContext) => TerminalSession

/** Tur adindan uretici bulan kayit defteri. */
export type SessionFactoryRegistry = Map<string, SessionFactory>
