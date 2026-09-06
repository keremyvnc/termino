import { FileCode2, LayoutDashboard, Server, Terminal, X } from 'lucide-react'
import type { AreaTab } from './tabModel'

const STATUS_DOT: Record<string, string> = {
  running: 'bg-success',
  exited: 'bg-zinc-500',
  starting: 'bg-warn animate-pulse'
}

/** Terminal ve dosya sekmelerinin listesi; en solda sabit "Overview" sekmesi durur. */
export function TabStrip({
  tabs,
  activeId,
  overviewActive,
  dirty,
  onSelect,
  onSelectOverview,
  onClose
}: {
  tabs: AreaTab[]
  activeId: string | undefined
  overviewActive: boolean
  dirty: Record<string, boolean>
  onSelect(id: string): void
  onSelectOverview(): void
  onClose(id: string): void
}) {
  return (
    <div className="flex min-w-0 flex-1 items-end gap-0.5 overflow-x-auto">
      <button
        className={`flex h-8 shrink-0 items-center gap-1.5 rounded-t-md border border-b-0 px-2.5 text-xs ${
          overviewActive
            ? 'border-border bg-bg text-fg'
            : 'border-transparent text-muted hover:bg-panel-2 hover:text-fg'
        }`}
        onClick={onSelectOverview}
        title="Project overview"
      >
        <LayoutDashboard size={13} className={overviewActive ? 'text-accent' : ''} />
        Overview
      </button>
      {tabs.map((tab, index) => (
        <Tab
          key={tab.id}
          tab={tab}
          index={index + 1}
          active={!overviewActive && tab.id === activeId}
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
  index,
  active,
  dirty,
  onSelect,
  onClose
}: {
  tab: AreaTab
  index: number
  active: boolean
  dirty: boolean
  onSelect(): void
  onClose(): void
}) {
  return (
    <div
      onClick={onSelect}
      onAuxClick={(e) => e.button === 1 && onClose()}
      className={`group flex h-8 shrink-0 cursor-pointer items-center gap-1.5 rounded-t-md border border-b-0 pl-2.5 pr-1 text-xs ${
        active
          ? 'border-border bg-bg text-fg'
          : 'border-transparent text-muted hover:bg-panel-2 hover:text-fg'
      }`}
      title={index <= 9 ? `${tab.title} (Alt+${index})` : tab.title}
    >
      <TabIcon tab={tab} />
      <span className={`max-w-40 truncate ${tab.icon === 'file' ? 'font-mono' : ''}`}>
        {tab.title}
      </span>
      {dirty && <span className="text-warn" title="Unsaved changes">●</span>}
      <button
        className={`ml-0.5 rounded p-0.5 text-muted hover:bg-panel-3 hover:text-fg ${
          active ? '' : 'opacity-0 group-hover:opacity-100'
        }`}
        onClick={(e) => {
          e.stopPropagation()
          onClose()
        }}
        title="Close (Ctrl+Shift+W)"
      >
        <X size={11} />
      </button>
    </div>
  )
}

function TabIcon({ tab }: { tab: AreaTab }) {
  if (tab.icon === 'file') return <FileCode2 size={12} className="text-warn" />
  const dot = STATUS_DOT[tab.status ?? 'starting'] ?? 'bg-warn'
  return (
    <span className="relative flex items-center">
      {tab.icon === 'ssh' ? (
        <Server size={12} className="text-accent" />
      ) : (
        <Terminal size={12} className="text-muted" />
      )}
      <span className={`dot absolute -right-1 -top-1 h-1.5 w-1.5 ${dot}`} />
    </span>
  )
}
