import { LocalPtySession } from './LocalPtySession'
import { SshSession } from './SshSession'
import type { SessionFactory, SessionFactoryRegistry } from './TerminalSession'

/**
 * Uygulamayla birlikte gelen terminal turleri.
 * Yeni bir tur (serial, telnet...) eklemek icin buraya bir satir eklemek
 * veya calisma aninda `TerminalManager.register` cagirmak yeterlidir.
 */
export function createDefaultSessionFactories(): SessionFactoryRegistry {
  return new Map<string, SessionFactory>([
    ['local', (context) => new LocalPtySession(context)],
    ['ssh', (context) => new SshSession(context)]
  ])
}
