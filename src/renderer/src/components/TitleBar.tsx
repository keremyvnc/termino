import { TerminalSquare } from 'lucide-react'

export function TitleBar() {
  return (
    <header className="drag flex h-9 shrink-0 items-center gap-2 border-b border-border bg-bg px-3">
      <TerminalSquare size={16} className="text-accent" />
      <span className="text-xs font-semibold tracking-wide">Termino</span>
      <span className="text-[11px] text-muted">test terminal</span>
    </header>
  )
}
