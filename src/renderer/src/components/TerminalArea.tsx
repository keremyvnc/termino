import { Plus, Terminal } from 'lucide-react'
import type { Project } from '@shared/types'

/**
 * Terminal sekmeleri burada olacak (Asama 2: xterm.js + node-pty).
 * Simdilik yer tutucu.
 */
export function TerminalArea({ project }: { project: Project }) {
  return (
    <section className="flex min-w-0 flex-1 flex-col bg-bg">
      <div className="flex h-9 shrink-0 items-center border-b border-border bg-panel px-2">
        <div className="flex items-center gap-1 rounded-t-md border border-b-0 border-border bg-bg px-3 py-1.5 text-xs">
          <Terminal size={12} className="text-muted" />
          PowerShell
        </div>
        <button className="btn-icon ml-1" title="Yeni terminal (Asama 2)">
          <Plus size={14} />
        </button>
        <span className="ml-auto text-[11px] text-muted">{project.terminals.length} tanımlı oturum</span>
      </div>
      <div className="flex flex-1 items-center justify-center font-mono text-sm text-muted">
        <div className="text-center">
          <Terminal size={36} className="mx-auto mb-3 opacity-40" />
          <p>Terminal alanı 2. aşamada geliyor.</p>
          <p className="mt-1 text-xs opacity-70">xterm.js + node-pty ile yerel PowerShell, sonra SSH.</p>
        </div>
      </div>
    </section>
  )
}
