import type { Project } from '@shared/types'
import type { LocalShell } from '../../store/terminalTabs'
import { useEditorStore } from '../../store/useEditorStore'
import { useTerminalStore } from '../../store/useTerminalStore'
import { FileEditor } from '../editor/FileEditor'
import { ProjectOverview } from '../overview/ProjectOverview'
import { XtermView } from '../XtermView'
import { NewTerminalButton } from './NewTerminalButton'
import { TabStrip } from './TabStrip'
import { buildAreaTabs, isOverviewActive, OVERVIEW_TAB_ID } from './tabModel'
import { useTabShortcuts } from './useTabShortcuts'

/**
 * Terminal ve YAML editor sekmeleri ayni cubukta durur; tek seferde biri gorunur.
 * Hicbiri secili degilse proje ozeti (Overview) gorunur.
 */
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
  const overview = isOverviewActive(activeId, tabs)

  const open = (shell?: LocalShell): void => {
    void openTerminal(project.id, { project, ...(shell ? { shell } : {}) })
  }

  const close = (id: string): void => {
    if (files.some((f) => f.id === id)) closeEditor(id)
    else closeTerminal(id)
    // Kapanan sekme aktifse kalanlarin sonuncusu one gelir; kalan yoksa ozet.
    if (activeId !== id) return
    const next = tabs.filter((t) => t.id !== id).at(-1)
    setActive(project.id, next ? next.id : OVERVIEW_TAB_ID)
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
      <div className="flex h-9 shrink-0 items-end gap-2 border-b border-border bg-panel px-2">
        <TabStrip
          tabs={tabs}
          activeId={activeId}
          overviewActive={overview}
          dirty={dirty}
          onSelect={(id) => setActive(project.id, id)}
          onSelectOverview={() => setActive(project.id, OVERVIEW_TAB_ID)}
          onClose={close}
        />
        <NewTerminalButton onOpen={open} />
      </div>

      <div className="relative min-h-0 flex-1">
        {/* Tum projelerin terminalleri bagli kalir; proje degisince oturum ve scrollback kaybolmaz. */}
        {allTabs.map((tab) => (
          <XtermView
            key={tab.id}
            tab={tab}
            visible={tab.projectId === project.id && !overview && tab.id === activeId}
          />
        ))}
        {files.map((tab) => (
          <div
            key={tab.id}
            className="absolute inset-0"
            style={{ display: !overview && tab.id === activeId ? 'block' : 'none' }}
          >
            <FileEditor project={project} tab={tab} visible={!overview && tab.id === activeId} />
          </div>
        ))}
        {overview && <ProjectOverview project={project} onOpenTerminal={() => open()} />}
      </div>
    </section>
  )
}
