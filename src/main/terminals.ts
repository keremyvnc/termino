import * as pty from 'node-pty'
import { Client as SshClient, type ClientChannel } from 'ssh2'
import type { WebContents } from 'electron'
import { IPC } from '@shared/ipc'
import type { TermCreateOptions, TermExitInfo } from '@shared/ipc'
import type { ScriptStep } from '@shared/types'
import type { CredentialVault } from './credentials'
import { ScriptRunner } from './scriptRunner'
import { diagnoseNetwork, explainSshError } from './netDiag'

const YELLOW = (s: string): string => `\x1b[33m[termino] ${s}\x1b[0m\r\n`
const GRAY = (s: string): string => `\r\n\x1b[90m[termino] ${s}\x1b[0m\r\n`
const RED = (s: string): string => `\r\n\x1b[31m[termino] ${s}\x1b[0m\r\n`

/**
 * Terminal saglayici arayuzu. local (node-pty) ve ssh (ssh2) bunu uygular;
 * ileride serial/telnet ayni arayuzle eklenir.
 */
export interface TerminalSession {
  id: string
  write(data: string): void
  resize(cols: number, rows: number): void
  kill(): void
}

interface SessionHooks {
  onData: (d: string) => void
  onExit: (info: TermExitInfo) => void
}

/** {{degisken}} ve {{secret:ad}} cozumu. Secret once term:<defId>:<ad>, sonra ham ad olarak aranir. */
function makeResolver(
  vault: CredentialVault,
  vars: Record<string, string>,
  defId?: string
): (text: string) => Promise<string> {
  return async (text) => {
    let out = text.replace(/\{\{\s*([a-zA-Z_]+)\s*\}\}/g, (m, k: string) => vars[k] ?? m)
    const secretRe = /\{\{\s*secret:([^}\s]+)\s*\}\}/g
    for (const m of [...out.matchAll(secretRe)]) {
      const name = m[1]
      let v = defId ? await vault.get(`term:${defId}:${name}`) : null
      if (v === null) v = await vault.get(name)
      if (v === null) throw new Error(`kasada "${name}" adlı şifre yok`)
      out = out.replace(m[0], v)
    }
    return out
  }
}

class LocalPtySession implements TerminalSession {
  private proc: pty.IPty
  private runner: ScriptRunner | null = null

  constructor(
    public id: string,
    opts: TermCreateOptions,
    hooks: SessionHooks,
    vault: CredentialVault
  ) {
    const shell =
      opts.shell === 'cmd' ? 'cmd.exe' : (process.env['TERMINO_PWSH'] ?? 'powershell.exe')
    // Profil ciktisi (ornek: profildeki basibos ifadeler) ekrana gelmesin: profil yuklenir, ekran temizlenir.
    const args = opts.shell === 'cmd' ? [] : ['-NoLogo', '-NoExit', '-Command', 'Clear-Host']
    this.proc = pty.spawn(shell, args, {
      name: 'xterm-256color',
      cols: opts.cols ?? 120,
      rows: opts.rows ?? 30,
      cwd: opts.cwd ?? process.env['USERPROFILE'] ?? 'C:\\',
      env: { ...process.env, TERM: 'xterm-256color', TERMINO: '1' } as Record<string, string>,
      useConpty: true
    })
    this.proc.onData((d) => {
      hooks.onData(d)
      this.runner?.feed(d)
    })
    this.proc.onExit(({ exitCode, signal }) => {
      this.runner?.cancel()
      hooks.onExit({ id, exitCode, signal })
    })
    if (opts.script?.length) {
      this.runner = new ScriptRunner(
        { write: (d) => this.write(d), note: (t) => hooks.onData(GRAY(t)) },
        makeResolver(vault, opts.vars ?? {}, opts.defId)
      )
      void this.runner.run(opts.script).finally(() => (this.runner = null))
    }
  }

  write(data: string): void {
    this.proc.write(data)
  }
  resize(cols: number, rows: number): void {
    if (cols > 0 && rows > 0) this.proc.resize(cols, rows)
  }
  kill(): void {
    this.runner?.cancel()
    try {
      this.proc.kill()
    } catch {
      /* zaten kapanmis */
    }
  }
}

class SshSession implements TerminalSession {
  private client = new SshClient()
  private stream: ClientChannel | null = null
  private cols: number
  private rows: number
  private runner: ScriptRunner | null = null
  private closed = false

  constructor(
    public id: string,
    private opts: TermCreateOptions,
    private hooks: SessionHooks,
    private vault: CredentialVault
  ) {
    this.cols = opts.cols ?? 120
    this.rows = opts.rows ?? 30
    void this.connect()
  }

  private resolveVars(text: string): Promise<string> {
    return makeResolver(this.vault, this.opts.vars ?? {}, this.opts.defId)(text)
  }

  private async connect(): Promise<void> {
    const ssh = this.opts.ssh
    if (!ssh) return this.fail('SSH ayarları eksik')
    const password = ssh.credentialRef ? await this.vault.get(ssh.credentialRef) : null
    if (ssh.credentialRef && password === null) {
      return this.fail('Şifre kasada bulunamadı. Oturum tanımından şifreyi kaydet.')
    }
    const port = ssh.port ?? 22
    this.hooks.onData(`\x1b[90m${ssh.username}@${ssh.host}:${port} bağlanıyor…\x1b[0m\r\n`)
    // Ag teshisi baglantiya paralel calisir; uyarilar hemen basilir.
    void diagnoseNetwork(ssh.host, this.opts.net).then((w) => {
      if (!this.closed) w.forEach((line) => this.hooks.onData(YELLOW(line)))
    })

    this.client
      .on('ready', () => {
        this.client.shell(
          { term: 'xterm-256color', cols: this.cols, rows: this.rows },
          (err, stream) => {
            if (err) return this.fail(err.message)
            this.stream = stream
            stream.on('data', (d: Buffer) => {
              const text = d.toString('utf8')
              this.hooks.onData(text)
              this.runner?.feed(text)
            })
            stream.stderr.on('data', (d: Buffer) => this.hooks.onData(d.toString('utf8')))
            stream.on('close', () => {
              this.client.end()
              this.finish(0)
            })
            void this.runScript(this.opts.script ?? [])
          }
        )
      })
      .on('error', (e) => this.fail(explainSshError(e.message, ssh.host, port)))
      .on('close', () => this.finish(0))
      .on('keyboard-interactive', (_n, _i, _l, _prompts, finish) => {
        finish(password ? [password] : [])
      })
      .connect({
        host: ssh.host,
        port,
        username: ssh.username,
        password: password ?? undefined,
        tryKeyboard: true,
        readyTimeout: 15000,
        keepaliveInterval: 20000
      })
  }

  private async runScript(steps: ScriptStep[]): Promise<void> {
    if (!steps.length) return
    this.runner = new ScriptRunner(
      {
        write: (d) => this.write(d),
        note: (t) => this.hooks.onData(GRAY(t))
      },
      (t) => this.resolveVars(t)
    )
    await this.runner.run(steps)
    this.runner = null
  }

  private fail(msg: string): void {
    this.hooks.onData(RED(msg))
    this.finish(1)
  }

  private finish(code: number): void {
    if (this.closed) return
    this.closed = true
    this.runner?.cancel()
    this.hooks.onExit({ id: this.id, exitCode: code })
  }

  write(data: string): void {
    this.stream?.write(data)
  }
  resize(cols: number, rows: number): void {
    this.cols = cols
    this.rows = rows
    this.stream?.setWindow(rows, cols, 0, 0)
  }
  kill(): void {
    this.runner?.cancel()
    try {
      this.stream?.end()
      this.client.end()
    } catch {
      /* yoksay */
    }
    this.finish(0)
  }
}

export class TerminalManager {
  private sessions = new Map<string, TerminalSession>()

  constructor(
    private getWebContents: () => WebContents | null,
    private vault: CredentialVault
  ) {}

  private send(channel: string, payload: unknown): void {
    const wc = this.getWebContents()
    if (wc && !wc.isDestroyed()) wc.send(channel, payload)
  }

  create(opts: TermCreateOptions): string {
    const id = opts.id
    if (this.sessions.has(id)) throw new Error(`Terminal zaten var: ${id}`)
    const hooks: SessionHooks = {
      onData: (data) => this.send(IPC.termData, { id, data }),
      onExit: (info) => {
        this.sessions.delete(id)
        this.send(IPC.termExit, info)
      }
    }
    const session =
      opts.kind === 'ssh'
        ? new SshSession(id, opts, hooks, this.vault)
        : new LocalPtySession(id, opts, hooks, this.vault)
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
