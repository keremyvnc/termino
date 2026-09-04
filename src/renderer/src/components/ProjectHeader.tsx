import { useState } from 'react'
import { Download, Trash2 } from 'lucide-react'
import type { Project } from '@shared/types'
import { PROJECT_COLORS } from '@shared/types'
import { useAppStore } from '../store/useAppStore'

export function ProjectHeader({ project }: { project: Project }) {
  const updateProject = useAppStore((s) => s.updateProject)
  const removeProject = useAppStore((s) => s.removeProject)
  const showToast = useAppStore((s) => s.showToast)
  const [confirm, setConfirm] = useState(false)

  return (
    <div className="flex h-12 shrink-0 items-center gap-3 border-b border-border bg-panel px-4">
      <div className="group relative">
        <span
          className="block h-4 w-4 cursor-pointer rounded-full ring-2 ring-transparent group-hover:ring-border"
          style={{ background: project.color }}
        />
        <div className="absolute left-0 top-6 z-10 hidden gap-1 rounded-md border border-border bg-panel-2 p-1.5 group-hover:flex">
          {PROJECT_COLORS.map((c) => (
            <button
              key={c}
              className="h-4 w-4 rounded-full hover:scale-110"
              style={{ background: c }}
              onClick={() => void updateProject({ id: project.id, color: c })}
            />
          ))}
        </div>
      </div>
      <input
        className="min-w-0 flex-1 bg-transparent text-base font-semibold outline-none"
        value={project.name}
        onChange={(e) => void updateProject({ id: project.id, name: e.target.value })}
        placeholder="Proje adı"
      />
      <input
        className="w-72 bg-transparent text-xs text-muted outline-none placeholder:text-muted/50"
        value={project.description}
        onChange={(e) => void updateProject({ id: project.id, description: e.target.value })}
        placeholder="Açıklama…"
      />
      <button
        className="btn-icon"
        title="Projeyi dışa aktar (şifreler dahil edilmez)"
        onClick={() =>
          void window.api.app.exportProject(project).then((ok) => ok && showToast('Proje dışa aktarıldı.'))
        }
      >
        <Download size={14} />
      </button>
      {confirm ? (
        <div className="flex items-center gap-1">
          <button
            className="btn btn-danger"
            onClick={() => void removeProject(project.id).then(() => setConfirm(false))}
          >
            Sil
          </button>
          <button className="btn" onClick={() => setConfirm(false)}>
            Vazgeç
          </button>
        </div>
      ) : (
        <button className="btn-icon" title="Projeyi sil" onClick={() => setConfirm(true)}>
          <Trash2 size={14} />
        </button>
      )}
    </div>
  )
}
