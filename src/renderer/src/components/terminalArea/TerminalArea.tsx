import { Plus, Terminal as TerminalIcon } from 'lucide-react'
import type { Project } from '@shared/types'
import type { LocalShell } from '../../store/terminalTabs'
import { useEditorStore } from '../../store/useEditorStore'
import { useTerminalStore } from '../../store/useTerminalStore'
import { FileEditor } from '../editor/FileEditor'
import { XtermView } from '../XtermView'
import { NewTerminalButton } from './NewTerminalButton'
import { TabStrip } from './TabStrip'
import { buildAreaTabs } from './tabModel'
import { useTabShortcuts } from './useTabShortcuts'

/** Terminal ve YAML editor sekmeleri ayni cubukta durur; tek seferde biri gorunur. */
export function TerminalArea({ project }: { project: Project }) {
  const allTabs = useTerminalStore((s) => s.tabs)
  const activeId = useTerminalStore((s) => s.activeByProject[project.id])
  const openTerminal = useTerminalStore((s) => s.open)
  const closeTerminal = useTerminalStore((s) => s.close)
  const setActive = useTerminalStore((s) => s.setActive)
  const editorTabs = useEditorStore((s) => s.tabs)
  const dirty = useEditorStore((s) => s.dirty)
  const closeEditor = useEditorStore((s) => s.close)

  const terminals = allTabs.filter((t) => t.projectId === project.id)
  const files = editorTabs.filter((t) => t.projectId === project.id)
  const tabs = buildAreaTabs(project, terminals, files)

  const open = (shell?: LocalShell): void => {
    void openTerminal(project.id, { project, ...(shell ? { shell } : {}) })
  }

  const close = (id: string): void => {
    if (files.some((f) => f.id === id)) closeEditor(id)
    else closeTerminal(id)
    // Kapanan sekme aktifse kalanlarin sonuncusu one gelir.
    if (activeId !== id) return
    const next = tabs.filter((t) => t.id !== id).at(-1)
    if (next) setActive(project.id, next.id)
  }

  useTabShortcuts({
    tabs,
    activeId,
    onSelect: (id) => setActive(project.id, id),
    onNewTerminal: () => open(),
    onClose: close
  })

  return (
    <section className="flex min-w-0 flex-1 flex-col bg-bg">
      <div className="flex h-9 shrink-0 items-end gap-0.5 border-b border-border bg-panel px-2">
        <TabStrip
          tabs={tabs}
          activeId={activeId}
          dirty={dirty}
          onSelect={(id) => setActive(project.id, id)}
          onClose={close}
        />
        <NewTerminalButton onOpen={open} />
      </div>

      <div className="relative min-h-0 flex-1">
        {terminals.map((tab) => (
          <XtermView key={tab.id} tab={tab} visible={tab.id === activeId} />
        ))}
        {files.map((tab) => (
          <div
            key={tab.id}
            className="absolute inset-0"
            style={{ display: tab.id === activeId ? 'block' : 'none' }}
          >
            <FileEditor project={project} tab={tab} visible={tab.id === activeId} />
          </div>
        ))}
        {tabs.length === 0 && <EmptyArea onOpen={() => open()} />}
      </div>
    </section>
  )
}

function EmptyArea({ onOpen }: { onOpen(): void }) {
  return (
    <div className="flex h-full items-center justify-center font-mono text-sm text-muted">
      <div className="text-center">
        <TerminalIcon size={36} className="mx-auto mb-3 opacity-40" />
        <p>Soldaki ağaçtan bir oturum ya da komut dosyası seç.</p>
        <button className="btn btn-primary mt-4" onClick={onOpen}>
          <Plus size={12} /> PowerShell aç
        </button>
        <p className="mt-3 text-xs opacity-60">
          ▶ çalıştırır · çift tık da çalıştırır · Ctrl+S kaydeder · Ctrl+K palet · Alt+1..9 sekme
        </p>
      </div>
    </div>
  )
}
