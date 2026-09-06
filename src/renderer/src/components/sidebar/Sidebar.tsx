import { FolderOpen, Import, Plus } from 'lucide-react'
import { useAppStore } from '../../store/useAppStore'
import { AdapterList } from '../AdapterList'
import { ProjectNode } from './ProjectNode'

const VERSION = 'v0.1.0'

/**
 * VS Code Explorer benzeri agac: proje > sessions/ > *.yaml, commands/ > *.yaml.
 * Dosyaya tik editoru acar, ▶ calistirir.
 */
export function Sidebar() {
  const projects = useAppStore((s) => s.projects)
  const selectedId = useAppStore((s) => s.selectedId)
  const select = useAppStore((s) => s.select)
  const openNewProject = useAppStore((s) => s.openNewProject)
  const importProject = useAppStore((s) => s.importProject)

  return (
    <aside className="flex w-72 shrink-0 flex-col border-r border-border bg-panel">
      <div className="section-title">
        <span>Projeler</span>
        <span className="flex items-center">
          <button className="btn-icon" title="Proje içe aktar" onClick={() => void importProject()}>
            <Import size={13} />
          </button>
          <button className="btn-icon" title="Yeni proje" onClick={openNewProject}>
            <Plus size={14} />
          </button>
        </span>
      </div>

      <ul className="min-h-0 flex-1 overflow-y-auto px-1.5 pb-2">
        {projects.length === 0 && (
          <li className="px-2 py-6 text-center text-xs text-muted">Henüz proje yok</li>
        )}
        {projects.map((project) => (
          <ProjectNode
            key={project.id}
            project={project}
            open={project.id === selectedId}
            onSelect={() => select(project.id)}
          />
        ))}
      </ul>

      <AdapterList />
      <SidebarFooter />
    </aside>
  )
}

function SidebarFooter() {
  return (
    <footer className="flex shrink-0 items-center justify-between border-t border-border px-3 py-2 text-[11px] text-muted">
      <span>{VERSION}</span>
      <button
        className="flex items-center gap-1 hover:text-fg"
        title="Veri klasörünü aç (YAML dosyaları)"
        onClick={() => void window.api.app.openDataDir()}
      >
        <FolderOpen size={12} /> dosyalar
      </button>
    </footer>
  )
}
