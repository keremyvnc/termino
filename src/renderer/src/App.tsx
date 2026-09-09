import { useEffect } from 'react'
import { useAppStore, useSelectedProject } from './store/useAppStore'
import { useUiStore } from './store/useUiStore'
import { useShellStore } from './store/useShellStore'
import { TitleBar } from './components/TitleBar'
import { StatusBar } from './components/StatusBar'
import { Sidebar } from './components/sidebar/Sidebar'
import { ProjectHeader } from './components/ProjectHeader'
import { TerminalArea } from './components/terminalArea/TerminalArea'
import { RightPanel } from './components/RightPanel'
import { EmptyState } from './components/EmptyState'
import { Toast } from './components/Toast'
import { ConfirmDialog } from './components/ConfirmDialog'
import { CommandPalette } from './components/palette/CommandPalette'
import { NewProjectDialog } from './components/NewProjectDialog'

export default function App() {
  const load = useAppStore((s) => s.load)
  const loadShells = useShellStore((s) => s.load)
  const setProjects = useAppStore((s) => s.setProjects)
  const setAdapters = useAppStore((s) => s.setAdapters)
  const showToast = useAppStore((s) => s.showToast)
  const refreshAdapters = useAppStore((s) => s.refreshAdapters)
  const loading = useAppStore((s) => s.loading)
  const project = useSelectedProject()
  const paletteOpen = useUiStore((s) => s.paletteOpen)
  const setPalette = useUiStore((s) => s.setPalette)
  const togglePalette = useUiStore((s) => s.togglePalette)
  const networkOpen = useUiStore((s) => s.networkPanelOpen)

  useEffect(() => {
    void load()
    void loadShells()
    const offProjects = window.api.projects.onChanged(setProjects)
    const offAdapters = window.api.network.onAdaptersChanged(setAdapters)
    const offAuto = window.api.network.onAutoApplied((ev) => {
      showToast(
        ev.result.ok
          ? `${ev.projectName}: profile applied automatically to ${ev.adapterName}`
          : `${ev.projectName}: automatic apply failed — ${ev.result.message}`,
        ev.result.ok ? 'success' : 'error'
      )
      setTimeout(() => void refreshAdapters(), 1500)
    })
    return () => {
      offProjects()
      offAdapters()
      offAuto()
    }
  }, [load, loadShells, setProjects, setAdapters, showToast, refreshAdapters])

  useEffect(() => {
    const onKey = (e: KeyboardEvent): void => {
      if (e.ctrlKey && !e.shiftKey && e.key.toLowerCase() === 'k') {
        e.preventDefault()
        togglePalette()
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [togglePalette])

  return (
    <div className="flex h-full flex-col">
      <TitleBar />
      <div className="flex min-h-0 flex-1">
        <Sidebar />
        <main className="flex min-w-0 flex-1 flex-col">
          {loading ? null : project ? (
            <>
              <ProjectHeader project={project} />
              <div className="flex min-h-0 flex-1">
                <TerminalArea project={project} />
                {networkOpen && <RightPanel project={project} />}
              </div>
            </>
          ) : (
            <EmptyState />
          )}
        </main>
      </div>
      <StatusBar project={project} />
      <Toast />
      <ConfirmDialog />
      <NewProjectDialog />
      {paletteOpen && project && (
        <CommandPalette project={project} onClose={() => setPalette(false)} />
      )}
    </div>
  )
}
