import { useEffect, useMemo, useRef, useState } from 'react'
import type { Project } from '@shared/types'
import { useAppStore } from '../../store/useAppStore'
import { useTerminalStore } from '../../store/useTerminalStore'
import { buildPaletteItems, filterPaletteItems, type PaletteItem } from './paletteItems'

/** Ctrl+K: komutlar, oturumlar ve hizli eylemler icin arama paleti. */
export function CommandPalette({ project, onClose }: { project: Project; onClose: () => void }) {
  const runCommand = useTerminalStore((s) => s.runCommand)
  const openDef = useTerminalStore((s) => s.openDef)
  const openTerminal = useTerminalStore((s) => s.open)
  const showToast = useAppStore((s) => s.showToast)
  const [query, setQuery] = useState('')
  const [highlighted, setHighlighted] = useState(0)
  const inputRef = useRef<HTMLInputElement>(null)

  const items = useMemo(
    () =>
      filterPaletteItems(
        buildPaletteItems(project, { runCommand, openDef, openTerminal, showToast }),
        query
      ),
    [project, query, runCommand, openDef, openTerminal, showToast]
  )

  useEffect(() => {
    inputRef.current?.focus()
  }, [])
  useEffect(() => setHighlighted(0), [query])

  const choose = (item: PaletteItem | undefined): void => {
    if (!item) return
    onClose()
    Promise.resolve(item.run()).catch((e) => showToast(String((e as Error).message ?? e)))
  }

  const onKeyDown = (e: React.KeyboardEvent): void => {
    if (e.key === 'Escape') return onClose()
    if (e.key === 'ArrowDown') {
      e.preventDefault()
      setHighlighted((i) => Math.min(items.length - 1, i + 1))
    } else if (e.key === 'ArrowUp') {
      e.preventDefault()
      setHighlighted((i) => Math.max(0, i - 1))
    } else if (e.key === 'Enter') {
      e.preventDefault()
      choose(items[highlighted])
    }
  }

  return (
    <div
      className="fixed inset-0 z-40 flex items-start justify-center bg-black/50 pt-24"
      onMouseDown={onClose}
    >
      <div
        className="w-[560px] max-w-[90vw] overflow-hidden rounded-lg border border-border bg-panel shadow-2xl"
        onMouseDown={(e) => e.stopPropagation()}
      >
        <input
          ref={inputRef}
          className="w-full border-b border-border bg-transparent px-4 py-3 text-sm outline-none placeholder:text-muted/60"
          placeholder="Search commands, sessions or actions…"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onKeyDown={onKeyDown}
        />

        <ul className="max-h-80 overflow-y-auto p-1">
          {items.length === 0 && (
            <li className="px-3 py-6 text-center text-xs text-muted">No matches</li>
          )}
          {items.map((item, index) => (
            <li key={item.id}>
              <ItemRow
                item={item}
                active={index === highlighted}
                onHover={() => setHighlighted(index)}
                onSelect={() => choose(item)}
              />
            </li>
          ))}
        </ul>

        <div className="flex gap-3 border-t border-border px-3 py-1.5 text-[10px] text-muted">
          <span>↑↓ select</span>
          <span>Enter run</span>
          <span>Esc close</span>
        </div>
      </div>
    </div>
  )
}

function ItemRow({
  item,
  active,
  onHover,
  onSelect
}: {
  item: PaletteItem
  active: boolean
  onHover(): void
  onSelect(): void
}) {
  return (
    <button
      className={`flex w-full items-center gap-2.5 rounded-md px-3 py-2 text-left ${
        active ? 'bg-panel-2' : 'hover:bg-panel-2/60'
      }`}
      onMouseEnter={onHover}
      onClick={onSelect}
    >
      {item.icon}
      <span className="text-sm">{item.label}</span>
      <span className="ml-auto max-w-[50%] truncate font-mono text-[11px] text-muted">
        {item.hint}
      </span>
      <span className="w-12 text-right text-[10px] uppercase text-muted/70">{item.group}</span>
    </button>
  )
}
