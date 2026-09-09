import * as pty from 'node-pty'
import { homedir } from 'os'
import type { TermCreateOptions } from '@shared/ipc'
import type { ScriptStep } from '@shared/types'
import { ScriptQueue } from './ScriptQueue'
import * as ansi from './ansi'
import { createStartupGate } from './startupGate'
import { createVariableResolver } from './variableResolver'
import { resolveShell, type ShellSpec } from './shells'
import type { SessionContext, SessionHooks, TerminalSession } from './TerminalSession'

const DEFAULT_COLS = 120
const DEFAULT_ROWS = 30

/** Yerel kabuk oturumu (node-pty). */
export class LocalPtySession implements TerminalSession {
  readonly id: string
  private readonly process: pty.IPty
  private readonly hooks: SessionHooks
  private readonly scripts: ScriptQueue

  constructor(context: SessionContext) {
    this.id = context.id
    this.hooks = context.hooks
    const shell = resolveShell(context.options.shell)
    this.process = spawnShell(context.options, shell)
    this.scripts = new ScriptQueue(
      {
        write: (data) => this.write(data),
        note: (text) => this.hooks.onData(ansi.note(text))
      },
      createVariableResolver(context.secrets, context.options.vars ?? {}, context.options.defId)
    )

    // PowerShell acilis ciktisi (profil mesajlari/hatalari) Clear-Host'a kadar ekrana gitmez.
    // Diger kabuklarda boyle bir isaret yok; cikti dogrudan ekrana gider.
    const gate = shell.hidesStartupOutput
      ? createStartupGate({
          emit: (data) => this.hooks.onData(data),
          onDiscard: (text) =>
            context.logger?.log('terminal:startup-output-hidden', { id: this.id, text })
        })
      : null

    this.process.onData((data) => {
      if (gate) gate.feed(data)
      else this.hooks.onData(data)
      this.scripts.feed(data)
    })
    this.process.onExit(({ exitCode, signal }) => {
      this.scripts.cancel()
      this.hooks.onExit({ id: this.id, exitCode, signal })
    })

    // Kabuk hemen hazir: baglanti senaryosu varsa dogrudan kuyruga girer.
    this.scripts.ready()
    if (context.options.script?.length) void this.scripts.run(context.options.script)
  }

  runScript(steps: ScriptStep[]): Promise<void> {
    return this.scripts.run(steps)
  }

  write(data: string): void {
    this.process.write(data)
  }

  resize(cols: number, rows: number): void {
    if (cols > 0 && rows > 0) this.process.resize(cols, rows)
  }

  kill(): void {
    this.scripts.cancel()
    try {
      this.process.kill()
    } catch {
      /* zaten kapanmis */
    }
  }
}

/** Hangi kabugun calisacagina `shells.ts` karar verir; burasi yalnizca baslatir. */
function spawnShell(options: TermCreateOptions, shell: ShellSpec): pty.IPty {
  return pty.spawn(shell.path, shell.args, {
    name: 'xterm-256color',
    cols: options.cols ?? DEFAULT_COLS,
    rows: options.rows ?? DEFAULT_ROWS,
    cwd: options.cwd ?? homedir(),
    env: { ...process.env, TERM: 'xterm-256color', TERMINO: '1' } as Record<string, string>,
    // Windows disinda yok sayilir.
    useConpty: true
  })
}
