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
  const total = project.terminals.length + project.commands.length
  return (
    <li className="mb-0.5">
      <button
        onClick={onSelect}
        className={`flex h-8 w-full items-center gap-1.5 rounded-md px-1.5 text-left text-sm transition-colors ${
          open ? 'bg-panel-3 text-fg' : 'text-muted hover:bg-panel-2 hover:text-fg'
        }`}
        title={project.description || project.name}
      >
        {open ? (
          <ChevronDown size={13} className="shrink-0" />
        ) : (
          <ChevronRight size={13} className="shrink-0" />
        )}
        <span className="dot h-2.5 w-2.5" style={{ background: project.color }} />
        <span className="truncate font-medium">{project.name}</span>
        {!open && total > 0 && (
          <span className="ml-auto text-[11px] text-muted/70">{total}</span>
        )}
      </button>

      {open && (
        <div className="mb-1 ml-3.5 border-l border-border/70 pl-1.5">
          <ProjectFolder kind="session" project={project} />
          <ProjectFolder kind="command" project={project} />
        </div>
      )}
    </li>
  )
}
