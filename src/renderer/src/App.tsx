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
  const loading = useAppStore((s) => s.loading)
  const project = useSelectedProject()

  useEffect(() => {
    void load()
    return window.api.network.onAdaptersChanged(setAdapters)
  }, [load, setAdapters])

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
