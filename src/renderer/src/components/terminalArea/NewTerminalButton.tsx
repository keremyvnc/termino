import { useEffect, useRef, useState } from 'react'
import { ChevronDown, Plus, Terminal as TerminalIcon } from 'lucide-react'
import type { LocalShell } from '../../store/terminalTabs'

const SHELLS: { kind: LocalShell; label: string }[] = [
  { kind: 'powershell', label: 'PowerShell' },
  { kind: 'cmd', label: 'CMD' }
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
    document.addEventListener('mousedown', closeOnOutsideClick)
    return () => document.removeEventListener('mousedown', closeOnOutsideClick)
  }, [menuOpen])

  return (
    <div ref={containerRef} className="relative mb-1 flex shrink-0 items-center">
      <button
        className="btn btn-primary rounded-r-none border-r-0"
        title="Yeni PowerShell (Ctrl+Shift+T)"
        onClick={() => onOpen()}
      >
        <Plus size={13} /> Terminal
      </button>
      <button
        className="btn btn-primary rounded-l-none px-1.5"
        onClick={() => setMenuOpen((open) => !open)}
        title="Kabuk türü seç"
      >
        <ChevronDown size={12} />
      </button>

      {menuOpen && (
        <div className="absolute right-0 top-8 z-20 w-44 rounded-md border border-border bg-panel-2 p-1 shadow-lg">
          {SHELLS.map(({ kind, label }) => (
            <button
              key={kind}
              className="flex w-full items-center gap-2 rounded px-2 py-1.5 text-left text-xs hover:bg-border/60"
              onClick={() => {
                setMenuOpen(false)
                onOpen(kind)
              }}
            >
              <TerminalIcon size={12} className="text-muted" />
              {label}
            </button>
          ))}
        </div>
      )}
    </div>
  )
}
