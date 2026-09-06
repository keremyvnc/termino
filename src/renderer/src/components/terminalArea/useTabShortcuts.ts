import { useEffect } from 'react'
import type { AreaTab } from './tabModel'

interface Handlers {
  tabs: AreaTab[]
  activeId: string | undefined
  onSelect(id: string): void
  onNewTerminal(): void
  onClose(id: string): void
}

/**
 * Sekme kisayollari: Ctrl+Shift+T yeni sekme, Ctrl+Shift+W kapat, Alt+1..9 sekme sec.
 * Xterm bu tuslari `attachCustomKeyEventHandler` icinde pencereye kabartir.
 */
export function useTabShortcuts({
  tabs,
  activeId,
  onSelect,
  onNewTerminal,
  onClose
}: Handlers): void {
  useEffect(() => {
    const handle = (e: KeyboardEvent): void => {
      if (e.altKey && !e.ctrlKey && /^[1-9]$/.test(e.key)) {
        const tab = tabs[Number(e.key) - 1]
        if (!tab) return
        e.preventDefault()
        onSelect(tab.id)
        return
      }
      if (!e.ctrlKey || !e.shiftKey) return
      if (e.key === 'T') {
        e.preventDefault()
        onNewTerminal()
      } else if (e.key === 'W' && activeId) {
        e.preventDefault()
        onClose(activeId)
      }
    }
    window.addEventListener('keydown', handle)
    return () => window.removeEventListener('keydown', handle)
  }, [tabs, activeId, onSelect, onNewTerminal, onClose])
}
