import { useEffect, useRef, useState } from 'react'
import { ChevronDown, ChevronUp, X } from 'lucide-react'
import type { SearchAddon } from '@xterm/addon-search'

/** Ctrl+F: terminal ciktisinda arama cubugu. */
export function TerminalSearch({
  addon,
  onClose
}: {
  addon: SearchAddon | null
  onClose: () => void
}) {
  const [q, setQ] = useState('')
  const ref = useRef<HTMLInputElement>(null)

  useEffect(() => {
    ref.current?.focus()
    ref.current?.select()
  }, [])

  const opts = { caseSensitive: false, decorations: { matchOverviewRuler: '#38bdf8', activeMatchColorOverviewRuler: '#f59e0b' } }
  const next = (): void => {
    if (q) addon?.findNext(q, opts)
  }
  const prev = (): void => {
    if (q) addon?.findPrevious(q, opts)
  }

  useEffect(() => {
    if (q) addon?.findNext(q, { ...opts, incremental: true })
    else addon?.clearDecorations()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [q])

  const close = (): void => {
    addon?.clearDecorations()
    onClose()
  }

  return (
    <div className="absolute right-4 top-2 z-10 flex items-center gap-1 rounded-md border border-border bg-panel-2 px-2 py-1 shadow-lg">
      <input
        ref={ref}
        className="w-48 bg-transparent font-mono text-xs outline-none placeholder:text-muted/60"
        placeholder="search…"
        value={q}
        onChange={(e) => setQ(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === 'Escape') close()
          else if (e.key === 'Enter') e.shiftKey ? prev() : next()
        }}
      />
      <button className="btn-icon h-6 w-6" title="Previous (Shift+Enter)" onClick={prev}>
        <ChevronUp size={12} />
      </button>
      <button className="btn-icon h-6 w-6" title="Next (Enter)" onClick={next}>
        <ChevronDown size={12} />
      </button>
      <button className="btn-icon h-6 w-6" title="Close (Esc)" onClick={close}>
        <X size={12} />
      </button>
    </div>
  )
}
