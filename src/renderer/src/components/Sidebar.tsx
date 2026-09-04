import { FolderOpen, Plus } from 'lucide-react'
import { useAppStore } from '../store/useAppStore'
import { AdapterList } from './AdapterList'

export function Sidebar() {
  const projects = useAppStore((s) => s.projects)
  const selectedId = useAppStore((s) => s.selectedId)
  const select = useAppStore((s) => s.select)
  const createProject = useAppStore((s) => s.createProject)

  return (
    <aside className="flex w-64 shrink-0 flex-col border-r border-border bg-panel">
      <div className="section-title">
        <span>Projeler</span>
        <button className="btn-icon" title="Yeni proje" onClick={() => void createProject()}>
          <Plus size={14} />
        </button>
      </div>
      <ul className="min-h-0 flex-1 overflow-y-auto px-2">
        {projects.length === 0 && (
          <li className="px-2 py-6 text-center text-xs text-muted">Henüz proje yok</li>
        )}
        {projects.map((p) => {
          const active = p.id === selectedId
          return (
            <li key={p.id}>
              <button
                onClick={() => select(p.id)}
                className={`mb-0.5 flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-left text-sm ${
                  active ? 'bg-panel-2 text-fg' : 'text-muted hover:bg-panel-2/60 hover:text-fg'
                }`}
              >
                <span
                  className="h-2.5 w-2.5 shrink-0 rounded-full"
                  style={{ background: p.color }}
                />
                <span className="truncate">{p.name}</span>
                <span className="ml-auto text-[10px] text-muted">{p.commands.length}</span>
              </button>
            </li>
          )
        })}
      </ul>
      <AdapterList />
      <footer className="flex shrink-0 items-center justify-between border-t border-border px-3 py-2 text-[11px] text-muted">
        <span>v0.1.0</span>
        <button
          className="flex items-center gap-1 hover:text-fg"
          title="Veri klasörünü aç"
          onClick={() => void window.api.app.openDataDir()}
        >
          <FolderOpen size={12} /> veri
        </button>
      </footer>
    </aside>
  )
}
