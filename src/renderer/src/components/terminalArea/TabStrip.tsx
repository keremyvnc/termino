import { FileCode2, Server, X } from 'lucide-react'
import type { AreaTab } from './tabModel'

const STATUS_DOT: Record<string, string> = {
  running: 'bg-emerald-400',
  exited: 'bg-zinc-500',
  starting: 'bg-amber-400'
}

/** Terminal ve dosya sekmelerinin listesi. */
export function TabStrip({
  tabs,
  activeId,
  dirty,
  onSelect,
  onClose
}: {
  tabs: AreaTab[]
  activeId: string | undefined
  dirty: Record<string, boolean>
  onSelect(id: string): void
  onClose(id: string): void
}) {
  return (
    <div className="flex min-w-0 flex-1 items-end gap-0.5 overflow-x-auto">
      {tabs.map((tab) => (
        <Tab
          key={tab.id}
          tab={tab}
          active={tab.id === activeId}
          dirty={Boolean(dirty[tab.id])}
          onSelect={() => onSelect(tab.id)}
          onClose={() => onClose(tab.id)}
        />
      ))}
    </div>
  )
}

function Tab({
  tab,
  active,
  dirty,
  onSelect,
  onClose
}: {
  tab: AreaTab
  active: boolean
  dirty: boolean
  onSelect(): void
  onClose(): void
}) {
  return (
    <div
      onClick={onSelect}
      onAuxClick={(e) => e.button === 1 && onClose()}
      className={`group flex h-8 shrink-0 cursor-pointer items-center gap-1.5 rounded-t-md border border-b-0 px-3 text-xs ${
        active
          ? 'border-border bg-bg text-fg'
          : 'border-transparent text-muted hover:bg-panel-2 hover:text-fg'
      }`}
    >
      {tab.icon === 'file' ? (
        <FileCode2 size={11} className="text-amber-300" />
      ) : (
        <span
          className={`h-1.5 w-1.5 rounded-full ${STATUS_DOT[tab.status ?? 'starting'] ?? 'bg-amber-400'}`}
        />
      )}
      {tab.icon === 'ssh' && <Server size={11} className="text-accent" />}
      <span className={`max-w-40 truncate ${tab.icon === 'file' ? 'font-mono' : ''}`}>
        {tab.title}
      </span>
      {dirty && <span className="text-amber-400">●</span>}
      <button
        className="ml-1 rounded p-0.5 text-muted opacity-0 hover:bg-border hover:text-fg group-hover:opacity-100"
        onClick={(e) => {
          e.stopPropagation()
          onClose()
        }}
        title="Kapat (Ctrl+Shift+W)"
      >
        <X size={11} />
      </button>
    </div>
  )
}
