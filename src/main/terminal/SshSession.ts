import { Client as SshClient, type ClientChannel } from 'ssh2'
import type { TermCreateOptions } from '@shared/ipc'
import type { ScriptStep } from '@shared/types'
import type { SecretReader } from '../credentials'
import { ScriptQueue } from './ScriptQueue'
import { diagnoseNetwork, explainSshError } from '../network'
import * as ansi from './ansi'
import { createVariableResolver } from './variableResolver'
import type { SessionContext, SessionHooks, TerminalSession } from './TerminalSession'

const DEFAULT_COLS = 120
const DEFAULT_ROWS = 30
const DEFAULT_PORT = 22
const READY_TIMEOUT_MS = 15_000
const KEEPALIVE_MS = 20_000

/** SSH oturumu (ssh2). Baglanti kurulur kurulmaz senaryo calistirilir. */
export class SshSession implements TerminalSession {
  readonly id: string
  private readonly options: TermCreateOptions
  private readonly hooks: SessionHooks
  private readonly secrets: SecretReader
  private readonly scripts: ScriptQueue
  private readonly client = new SshClient()
  private stream: ClientChannel | null = null
  private cols: number
  private rows: number
  private closed = false

  constructor(context: SessionContext) {
    this.id = context.id
    this.options = context.options
    this.hooks = context.hooks
    this.secrets = context.secrets
    this.scripts = new ScriptQueue(
      {
        write: (data) => this.write(data),
        note: (text) => this.hooks.onData(ansi.note(text))
      },
      createVariableResolver(context.secrets, context.options.vars ?? {}, context.options.defId)
    )
    this.cols = context.options.cols ?? DEFAULT_COLS
    this.rows = context.options.rows ?? DEFAULT_ROWS
    // Baglanti senaryosu kuyrugun basina girer; kabuk acilinca calisir.
    if (context.options.script?.length) void this.scripts.run(context.options.script)
    void this.connect()
  }

  write(data: string): void {
    this.stream?.write(data)
  }

  runScript(steps: ScriptStep[]): Promise<void> {
    return this.scripts.run(steps)
  }

  resize(cols: number, rows: number): void {
    this.cols = cols
    this.rows = rows
    this.stream?.setWindow(rows, cols, 0, 0)
  }

  kill(): void {
    this.scripts.cancel()
    try {
      this.stream?.end()
      this.client.end()
    } catch {
      /* zaten kapanmis */
    }
    this.finish(0)
  }

  private async connect(): Promise<void> {
    const ssh = this.options.ssh
    if (!ssh) return this.fail('SSH settings are missing')

    const password = ssh.credentialRef ? await this.secrets.get(ssh.credentialRef) : null
    if (ssh.credentialRef && password === null) {
      return this.fail('Password not found in the vault. Save the password from the session definition.')
    }

    const port = ssh.port ?? DEFAULT_PORT
    this.hooks.onData(ansi.dim(`connecting to ${ssh.username}@${ssh.host}:${port}…`))
    this.reportDiagnostics(ssh.host)

    this.client
      .on('ready', () => this.openShell())
      .on('error', (e) => this.fail(explainSshError(e.message, ssh.host, port)))
      .on('close', () => this.finish(0))
      .on('keyboard-interactive', (_n, _i, _l, _prompts, finish) =>
        finish(password ? [password] : [])
      )
      .connect({
        host: ssh.host,
        port,
        username: ssh.username,
        password: password ?? undefined,
        tryKeyboard: true,
        readyTimeout: READY_TIMEOUT_MS,
        keepaliveInterval: KEEPALIVE_MS
      })
  }

  /** Ag teshisi baglantiya paralel calisir; uyarilar geldigi anda basilir. */
  private reportDiagnostics(host: string): void {
    void diagnoseNetwork(host, this.options.net).then((warnings) => {
      if (this.closed) return
      warnings.forEach((line) => this.hooks.onData(ansi.warning(line)))
    })
  }

  private openShell(): void {
    this.client.shell(
      { term: 'xterm-256color', cols: this.cols, rows: this.rows },
      (err, stream) => {
        if (err) return this.fail(err.message)
        this.stream = stream
        stream.on('data', (chunk: Buffer) => {
          const text = chunk.toString('utf8')
          this.hooks.onData(text)
          this.scripts.feed(text)
        })
        stream.stderr.on('data', (chunk: Buffer) => this.hooks.onData(chunk.toString('utf8')))
        stream.on('close', () => {
          this.client.end()
          this.finish(0)
        })
        this.scripts.ready()
      }
    )
  }

  private fail(message: string): void {
    this.hooks.onData(ansi.failure(message))
    this.finish(1)
  }

  private finish(exitCode: number): void {
    if (this.closed) return
    this.closed = true
    this.scripts.cancel()
    this.hooks.onExit({ id: this.id, exitCode })
  }
}
