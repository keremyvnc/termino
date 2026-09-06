import { ChevronDown, ChevronRight } from 'lucide-react'
import type { Project } from '@shared/types'
import { ProjectFolder } from './ProjectFolder'

/** Agactaki bir proje. Yalnizca secili proje acik durur. */
export function ProjectNode({
  project,
  open,
  onSelect
}: {
  project: Project
  open: boolean
  onSelect: () => void
}) {
  return (
    <li>
      <button
        onClick={onSelect}
        className={`flex w-full items-center gap-1.5 rounded-md px-1.5 py-1.5 text-left text-sm ${
          open ? 'bg-panel-2 text-fg' : 'text-muted hover:bg-panel-2/60 hover:text-fg'
        }`}
      >
        {open ? (
          <ChevronDown size={13} className="shrink-0" />
        ) : (
          <ChevronRight size={13} className="shrink-0" />
        )}
        <span className="h-2.5 w-2.5 shrink-0 rounded-full" style={{ background: project.color }} />
        <span className="truncate font-medium">{project.name}</span>
      </button>

      {open && (
        <div className="mb-1 ml-3 border-l border-border/60 pl-1">
          <ProjectFolder kind="session" project={project} />
          <ProjectFolder kind="command" project={project} />
        </div>
      )}
    </li>
  )
}
