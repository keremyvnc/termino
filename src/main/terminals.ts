import * as pty from 'node-pty'
import type { WebContents } from 'electron'
import { IPC } from '@shared/ipc'
import type { TermCreateOptions, TermExitInfo } from '@shared/ipc'

/**
 * Terminal saglayici arayuzu. Asama 2'de yalnizca yerel pty var;
 * Asama 4'te SSH ayni arayuzu uygulayacak.
 */
export interface TerminalSession {
  id: string
  write(data: string): void
  resize(cols: number, rows: number): void
  kill(): void
}

class LocalPtySession implements TerminalSession {
  private proc: pty.IPty

  constructor(
    public id: string,
    opts: TermCreateOptions,
    onData: (d: string) => void,
    onExit: (info: TermExitInfo) => void
  ) {
    const shell =
      opts.shell === 'cmd'
        ? 'cmd.exe'
        : (process.env['TERMINO_PWSH'] ?? 'powershell.exe')
    const args = opts.shell === 'cmd' ? [] : ['-NoLogo']
    this.proc = pty.spawn(shell, args, {
      name: 'xterm-256color',
      cols: opts.cols ?? 120,
      rows: opts.rows ?? 30,
      cwd: opts.cwd ?? process.env['USERPROFILE'] ?? 'C:\\',
      env: { ...process.env, TERM: 'xterm-256color', TERMINO: '1' } as Record<string, string>,
      useConpty: true
    })
    this.proc.onData(onData)
    this.proc.onExit(({ exitCode, signal }) => onExit({ id, exitCode, signal }))
  }

  write(data: string): void {
    this.proc.write(data)
  }
  resize(cols: number, rows: number): void {
    if (cols > 0 && rows > 0) this.proc.resize(cols, rows)
  }
  kill(): void {
    try {
      this.proc.kill()
    } catch {
      /* zaten kapanmis */
    }
  }
}

export class TerminalManager {
  private sessions = new Map<string, TerminalSession>()

  constructor(private getWebContents: () => WebContents | null) {}

  private send(channel: string, payload: unknown): void {
    const wc = this.getWebContents()
    if (wc && !wc.isDestroyed()) wc.send(channel, payload)
  }

  create(opts: TermCreateOptions): string {
    const id = opts.id
    if (this.sessions.has(id)) throw new Error(`Terminal zaten var: ${id}`)
    const session = new LocalPtySession(
      id,
      opts,
      (data) => this.send(IPC.termData, { id, data }),
      (info) => {
        this.sessions.delete(id)
        this.send(IPC.termExit, info)
      }
    )
    this.sessions.set(id, session)
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

  killAll(): void {
    for (const s of this.sessions.values()) s.kill()
    this.sessions.clear()
  }
}
