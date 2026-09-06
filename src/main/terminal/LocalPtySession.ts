import * as pty from 'node-pty'
import type { TermCreateOptions } from '@shared/ipc'
import type { ScriptStep } from '@shared/types'
import { ScriptQueue } from './ScriptQueue'
import * as ansi from './ansi'
import { createVariableResolver } from './variableResolver'
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
    this.process = spawnShell(context.options)
    this.scripts = new ScriptQueue(
      {
        write: (data) => this.write(data),
        note: (text) => this.hooks.onData(ansi.note(text))
      },
      createVariableResolver(context.secrets, context.options.vars ?? {}, context.options.defId)
    )

    this.process.onData((data) => {
      this.hooks.onData(data)
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

function spawnShell(options: TermCreateOptions): pty.IPty {
  const isCmd = options.shell === 'cmd'
  const file = isCmd ? 'cmd.exe' : (process.env['TERMINO_PWSH'] ?? 'powershell.exe')
  // Profil ciktisi (ornek: profildeki basibos ifadeler) ekrana gelmesin:
  // profil yuklenir, ardindan ekran temizlenir.
  const args = isCmd ? [] : ['-NoLogo', '-NoExit', '-Command', 'Clear-Host']

  return pty.spawn(file, args, {
    name: 'xterm-256color',
    cols: options.cols ?? DEFAULT_COLS,
    rows: options.rows ?? DEFAULT_ROWS,
    cwd: options.cwd ?? process.env['USERPROFILE'] ?? 'C:\\',
    env: { ...process.env, TERM: 'xterm-256color', TERMINO: '1' } as Record<string, string>,
    useConpty: true
  })
}
