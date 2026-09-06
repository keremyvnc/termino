import { useEffect, useRef, useState } from 'react'
import { Download, Trash2 } from 'lucide-react'
import type { Project } from '@shared/types'
import { PROJECT_COLORS } from '@shared/types'
import { useAppStore } from '../store/useAppStore'
import { confirmDialog } from '../store/useConfirmStore'

/** Proje basligi: renk, ad, aciklama ve proje duzeyinde eylemler. */
export function ProjectHeader({ project }: { project: Project }) {
  const updateProject = useAppStore((s) => s.updateProject)
  const removeProject = useAppStore((s) => s.removeProject)
  const showToast = useAppStore((s) => s.showToast)

  const remove = async (): Promise<void> => {
    const ok = await confirmDialog({
      title: `Delete project "${project.name}"?`,
      message:
        'All of its sessions, commands and the network profile will be removed. Saved passwords in the vault are kept until each session is deleted.',
      confirmLabel: 'Delete project',
      danger: true
    })
    if (ok) await removeProject(project.id)
  }

  const exportProject = (): void => {
    void window.api.app
      .exportProject(project)
      .then((ok) => ok && showToast('Project exported (passwords are not included).', 'success'))
  }

  return (
    <div className="flex h-12 shrink-0 items-center gap-3 border-b border-border bg-panel px-4">
      <ColorPicker color={project.color} onChange={(color) => void updateProject({ id: project.id, color })} />
      <input
        className="min-w-0 max-w-sm flex-1 rounded-md border border-transparent bg-transparent px-1.5 py-1 text-base font-semibold outline-none transition-colors hover:border-border focus:border-accent/60 focus:bg-bg"
        value={project.name}
        onChange={(e) => void updateProject({ id: project.id, name: e.target.value })}
        placeholder="Project name"
        title="Click to rename"
        spellCheck={false}
      />
      <input
        className="min-w-0 flex-1 rounded-md border border-transparent bg-transparent px-1.5 py-1 text-xs text-muted outline-none transition-colors placeholder:text-muted/50 hover:border-border focus:border-accent/60 focus:bg-bg focus:text-fg"
        value={project.description}
        onChange={(e) => void updateProject({ id: project.id, description: e.target.value })}
        placeholder="Add a description…"
        spellCheck={false}
      />
      <div className="flex items-center gap-0.5">
        <button className="btn-icon" title="Export project as JSON (passwords are not included)" onClick={exportProject}>
          <Download size={14} />
        </button>
        <button className="btn-icon hover:text-danger" title="Delete project" onClick={() => void remove()}>
          <Trash2 size={14} />
        </button>
      </div>
    </div>
  )
}

/** Tiklaninca acilan renk secici; fareyle ustune gelince degil, tikla acilir. */
function ColorPicker({ color, onChange }: { color: string; onChange(color: string): void }) {
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!open) return
    const close = (e: MouseEvent): void => {
      if (!ref.current?.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', close)
    return () => document.removeEventListener('mousedown', close)
  }, [open])

  return (
    <div ref={ref} className="relative">
      <button
        className="flex h-7 w-7 items-center justify-center rounded-md hover:bg-panel-3"
        title="Project color"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
      >
        <span className="block h-3.5 w-3.5 rounded-full ring-2 ring-border" style={{ background: color }} />
      </button>
      {open && (
        <div className="fade-in absolute left-0 top-8 z-20 flex gap-1.5 rounded-md border border-border bg-panel-2 p-2 shadow-lg">
          {PROJECT_COLORS.map((c) => (
            <button
              key={c}
              className={`h-5 w-5 rounded-full transition-transform hover:scale-110 ${
                c === color ? 'ring-2 ring-fg ring-offset-2 ring-offset-panel-2' : ''
              }`}
              style={{ background: c }}
              title={c}
              onClick={() => {
                onChange(c)
                setOpen(false)
              }}
            />
          ))}
        </div>
      )}
    </div>
  )
}
