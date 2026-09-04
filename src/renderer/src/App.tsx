import { useEffect } from 'react'
import { useAppStore, useSelectedProject } from './store/useAppStore'
import { TitleBar } from './components/TitleBar'
import { Sidebar } from './components/Sidebar'
import { ProjectHeader } from './components/ProjectHeader'
import { TerminalArea } from './components/TerminalArea'
import { RightPanel } from './components/RightPanel'
import { EmptyState } from './components/EmptyState'
import { Toast } from './components/Toast'

export default function App() {
  const load = useAppStore((s) => s.load)
  const setAdapters = useAppStore((s) => s.setAdapters)
  const showToast = useAppStore((s) => s.showToast)
  const refreshAdapters = useAppStore((s) => s.refreshAdapters)
  const loading = useAppStore((s) => s.loading)
  const project = useSelectedProject()

  useEffect(() => {
    void load()
    const offAdapters = window.api.network.onAdaptersChanged(setAdapters)
    const offAuto = window.api.network.onAutoApplied((ev) => {
      showToast(
        ev.result.ok
          ? `${ev.projectName}: ${ev.adapterName} profili otomatik uygulandı`
          : `${ev.projectName}: otomatik uygulama başarısız — ${ev.result.message}`
      )
      setTimeout(() => void refreshAdapters(), 1500)
    })
    return () => {
      offAdapters()
      offAuto()
    }
  }, [load, setAdapters, showToast, refreshAdapters])

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
                <RightPanel project={project} />
              </div>
            </>
          ) : (
            <EmptyState />
          )}
        </main>
      </div>
      <Toast />
    </div>
  )
}
