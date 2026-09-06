import { useState } from 'react'
import { ChevronDown, ChevronRight, Plus } from 'lucide-react'
import type { CommandDef, Project, TerminalDef } from '@shared/types'
import { useAppStore } from '../../store/useAppStore'
import { useEditorStore, type FileKind } from '../../store/useEditorStore'
import { FileRow } from './FileRow'
import { buildNewFile } from './newFileDefaults'

const LABELS: Record<FileKind, string> = { session: 'Sessions', command: 'Commands' }

/** Agactaki `sessions/` veya `commands/` klasoru. */
export function ProjectFolder({ kind, project }: { kind: FileKind; project: Project }) {
  const updateProject = useAppStore((s) => s.updateProject)
  const openEditor = useEditorStore((s) => s.open)
  const [collapsed, setCollapsed] = useState(false)

  const items: (TerminalDef | CommandDef)[] =
    kind === 'session' ? project.terminals : project.commands

  const addFile = (): void => {
    const { defId, patch } = buildNewFile(kind, project)
    void updateProject(patch)
    openEditor(project.id, kind, defId)
    setCollapsed(false)
  }

  return (
    <div>
      <div className="group flex items-center gap-1 py-0.5 pr-1 text-xs text-muted">
        <button
          className="flex min-w-0 flex-1 items-center gap-1 hover:text-fg"
          onClick={() => setCollapsed((value) => !value)}
        >
          {collapsed ? <ChevronRight size={12} /> : <ChevronDown size={12} />}
          <span className="font-semibold uppercase tracking-wider">{LABELS[kind]}</span>
          <span className="text-[10px]">{items.length}</span>
        </button>
        <button
          className="btn-icon h-5 w-5 opacity-0 group-hover:opacity-100"
          title="New file"
          onClick={addFile}
        >
          <Plus size={12} />
        </button>
      </div>

      {!collapsed && (
        <ul className="ml-2">
          {items.length === 0 && <li className="px-2 py-1 text-[11px] text-muted/70">empty</li>}
          {items.map((item) => (
            <FileRow key={item.id} kind={kind} project={project} item={item} />
          ))}
        </ul>
      )}
    </div>
  )
}
