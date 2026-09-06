import { useState } from 'react'
import { ChevronDown, ChevronRight, Plus } from 'lucide-react'
import type { CommandDef, Project, TerminalDef } from '@shared/types'
import { useAppStore } from '../../store/useAppStore'
import { useEditorStore, type FileKind } from '../../store/useEditorStore'
import { FileRow } from './FileRow'
import { buildNewFile } from './newFileDefaults'

const LABELS: Record<FileKind, { title: string; add: string; empty: string }> = {
  session: { title: 'Sessions', add: 'New session', empty: 'No sessions yet' },
  command: { title: 'Commands', add: 'New command', empty: 'No commands yet' }
}

/** Agactaki `sessions/` veya `commands/` klasoru. */
export function ProjectFolder({ kind, project }: { kind: FileKind; project: Project }) {
  const updateProject = useAppStore((s) => s.updateProject)
  const openEditor = useEditorStore((s) => s.open)
  const [collapsed, setCollapsed] = useState(false)
  const labels = LABELS[kind]

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
      <div className="group flex h-7 items-center gap-1 pr-0.5 text-xs text-muted">
        <button
          className="flex h-full min-w-0 flex-1 items-center gap-1 rounded-md px-1 hover:text-fg"
          onClick={() => setCollapsed((value) => !value)}
          aria-expanded={!collapsed}
        >
          {collapsed ? <ChevronRight size={12} /> : <ChevronDown size={12} />}
          <span className="font-semibold uppercase tracking-wider">{labels.title}</span>
          <span className="text-[11px] text-muted/70">{items.length}</span>
        </button>
        <button
          className="btn-icon btn-icon-sm text-muted/60 group-hover:text-muted"
          title={labels.add}
          onClick={addFile}
        >
          <Plus size={13} />
        </button>
      </div>

      {!collapsed && (
        <ul className="ml-1 space-y-px">
          {items.length === 0 && (
            <li className="px-2 py-1 text-[11px] text-muted/70">
              {labels.empty} ·{' '}
              <button className="text-accent hover:underline" onClick={addFile}>
                add
              </button>
            </li>
          )}
          {items.map((item) => (
            <FileRow key={item.id} kind={kind} project={project} item={item} />
          ))}
        </ul>
      )}
    </div>
  )
}
