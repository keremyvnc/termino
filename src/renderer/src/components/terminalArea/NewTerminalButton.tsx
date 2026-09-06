import { useEffect, useRef, useState } from 'react'
import { ChevronDown, Plus, Terminal as TerminalIcon } from 'lucide-react'
import type { LocalShell } from '../../store/terminalTabs'

const SHELLS: { kind: LocalShell; label: string; hint: string }[] = [
  { kind: 'powershell', label: 'PowerShell', hint: 'default' },
  { kind: 'cmd', label: 'Command Prompt', hint: 'cmd.exe' }
]

/** "Terminal" dugmesi ve kabuk turu menusu. */
export function NewTerminalButton({ onOpen }: { onOpen(shell?: LocalShell): void }) {
  const [menuOpen, setMenuOpen] = useState(false)
  const containerRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!menuOpen) return
    const closeOnOutsideClick = (e: MouseEvent): void => {
      if (!containerRef.current?.contains(e.target as Node)) setMenuOpen(false)
    }
    const closeOnEscape = (e: KeyboardEvent): void => {
      if (e.key === 'Escape') setMenuOpen(false)
    }
    document.addEventListener('mousedown', closeOnOutsideClick)
    document.addEventListener('keydown', closeOnEscape)
    return () => {
      document.removeEventListener('mousedown', closeOnOutsideClick)
      document.removeEventListener('keydown', closeOnEscape)
    }
  }, [menuOpen])

  return (
    <div ref={containerRef} className="relative mb-1 flex shrink-0 items-center">
      <button
        className="btn btn-primary rounded-r-none border-r-0"
        title="New PowerShell tab (Ctrl+Shift+T)"
        onClick={() => onOpen()}
      >
        <Plus size={13} /> Terminal
      </button>
      <button
        className="btn btn-primary rounded-l-none px-1.5"
        onClick={() => setMenuOpen((open) => !open)}
        title="Choose shell type"
        aria-haspopup="menu"
        aria-expanded={menuOpen}
      >
        <ChevronDown size={12} />
      </button>

      {menuOpen && (
        <div
          role="menu"
          className="fade-in absolute right-0 top-8 z-20 w-48 rounded-md border border-border bg-panel-2 p-1 shadow-lg"
        >
          {SHELLS.map(({ kind, label, hint }) => (
            <button
              key={kind}
              role="menuitem"
              className="flex w-full items-center gap-2 rounded px-2 py-1.5 text-left text-xs hover:bg-panel-3"
              onClick={() => {
                setMenuOpen(false)
                onOpen(kind)
              }}
            >
              <TerminalIcon size={12} className="text-muted" />
              {label}
              <span className="ml-auto text-[11px] text-muted">{hint}</span>
            </button>
          ))}
        </div>
      )}
    </div>
  )
}
