import { useEffect, useRef, useState } from 'react'
import { ChevronDown, Plus, Terminal as TerminalIcon } from 'lucide-react'
import type { LocalShell } from '../../store/terminalTabs'
import { useShellStore } from '../../store/useShellStore'

/** "Terminal" dugmesi ve kabuk turu menusu. */
export function NewTerminalButton({ onOpen }: { onOpen(shell?: LocalShell): void }) {
  const [menuOpen, setMenuOpen] = useState(false)
  const containerRef = useRef<HTMLDivElement>(null)
  // Menu sistemde gercekten bulunan kabuklari gosterir; ilki varsayilandir.
  const shells = useShellStore((s) => s.shells)

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
        title={`New ${shells[0]?.label ?? 'terminal'} tab (Ctrl+Shift+T)`}
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
          className="fade-in absolute right-0 top-8 z-20 w-56 rounded-md border border-border bg-panel-2 p-1 shadow-lg"
        >
          {shells.length === 0 && (
            <div className="px-2 py-1.5 text-xs text-muted">No shell found on this system.</div>
          )}
          {shells.map((shell) => (
            <button
              key={shell.id}
              role="menuitem"
              className="flex w-full items-center gap-2 rounded px-2 py-1.5 text-left text-xs hover:bg-panel-3"
              title={shell.path}
              onClick={() => {
                setMenuOpen(false)
                onOpen(shell.id)
              }}
            >
              <TerminalIcon size={12} className="text-muted" />
              {shell.label}
              {shell.isDefault && (
                <span className="ml-auto text-[11px] text-muted">default</span>
              )}
            </button>
          ))}
        </div>
      )}
    </div>
  )
}
