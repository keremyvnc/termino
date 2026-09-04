import { useEffect, useState } from 'react'
import type { Project } from '@shared/types'
import { CommandPanel } from './CommandPanel'
import { NetworkPanel } from './NetworkPanel'
import { TerminalDefsPanel } from './TerminalDefsPanel'

type Tab = 'commands' | 'network' | 'terminals'

/** Sekme secimi proje bazinda hatirlanir (yeniden mount olsa bile). */
const remembered = new Map<string, Tab>()

export function RightPanel({ project }: { project: Project }) {
  const [tab, setTabState] = useState<Tab>(() => remembered.get(project.id) ?? 'commands')
  const setTab = (t: Tab): void => {
    remembered.set(project.id, t)
    setTabState(t)
  }
  useEffect(() => {
    setTabState(remembered.get(project.id) ?? 'commands')
  }, [project.id])
  const tabs: { id: Tab; label: string }[] = [
    { id: 'commands', label: 'Komutlar' },
    { id: 'network', label: 'Ağ' },
    { id: 'terminals', label: 'Oturumlar' }
  ]
  return (
    <aside className="flex w-80 shrink-0 flex-col border-l border-border bg-panel">
      <div className="flex h-9 shrink-0 border-b border-border">
        {tabs.map((t) => (
          <button
            key={t.id}
            onClick={() => setTab(t.id)}
            className={`flex-1 text-xs font-medium ${
              tab === t.id
                ? 'border-b-2 border-accent text-fg'
                : 'text-muted hover:text-fg'
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>
      <div className="min-h-0 flex-1 overflow-y-auto">
        {tab === 'commands' && <CommandPanel project={project} />}
        {tab === 'network' && <NetworkPanel project={project} />}
        {tab === 'terminals' && <TerminalDefsPanel project={project} />}
      </div>
    </aside>
  )
}
