import { ExternalLink, FileCode2, Globe, Play, Server, Terminal, Trash2 } from 'lucide-react'
import type { CommandDef, Project, TerminalDef } from '@shared/types'
import { useAppStore } from '../../store/useAppStore'
import { confirmDialog } from '../../store/useConfirmStore'
import { describeCommand, describeSession } from '../editor/stepText'
import { useEditorStore, type FileKind } from '../../store/useEditorStore'
import { useTerminalStore } from '../../store/useTerminalStore'
import { isAlive } from '../../store/terminalTabs'

/** Agactaki tek bir YAML dosyasi: tik editoru acar, ▶ / cift tik calistirir. */
export function FileRow({
  kind,
  project,
  item
}: {
  kind: FileKind
  project: Project
  item: TerminalDef | CommandDef
}) {
  const showToast = useAppStore((s) => s.showToast)
  const openEditor = useEditorStore((s) => s.open)
  const activeId = useTerminalStore((s) => s.activeByProject[project.id])
  const running = useTerminalStore((s) =>
    s.tabs.some((t) => t.createOpts.defId === item.id && isAlive(t, project.id))
  )

  const session = kind === 'session' ? (item as TerminalDef) : null
  const command = kind === 'command' ? (item as CommandDef) : null
  const selected = activeId === `${kind}:${item.id}`

  const run = (): void => {
    const terminals = useTerminalStore.getState()
    const started = session
      ? terminals.openDef(project, session)
      : terminals.runCommand(project, item as CommandDef)
    started.catch((e) => showToast(String((e as Error).message ?? e), 'error'))
  }

  const remove = async (): Promise<void> => {
    const ok = await confirmDialog({
      title: `Delete "${item.name}"?`,
      message: session
        ? 'The session file and its saved passwords in the vault will be removed.'
        : 'The command file will be removed. Commands that call it will stop working.',
      confirmLabel: 'Delete',
      danger: true
    })
    if (ok) await deleteFile(project, kind, item.id)
  }

  const Icon = iconFor(session)
  const runTitle = session ? (session.kind === 'web' ? 'Open in browser' : 'Connect') : 'Run'

  return (
    <li
      className={`group tree-row pl-1.5 ${selected ? 'tree-row-active' : ''}`}
      onClick={() => openEditor(project.id, kind, item.id)}
      onDoubleClick={run}
      title={
        session ? describeSession(session, project) : describeCommand(item as CommandDef, project)
      }
    >
      <span className="relative shrink-0">
        <Icon size={13} className={session ? 'text-accent' : 'text-warn'} />
        {running && (
          <span
            className="dot absolute -right-1 -top-1 h-1.5 w-1.5 bg-success ring-2 ring-panel"
            title="Open"
          />
        )}
      </span>
      <span className="truncate">{item.name}</span>
      <span className="ml-1 truncate text-[11px] text-muted/60 group-hover:hidden">
        {hint(session, command)}
      </span>
      <span className="flex-1" />
      <button
        className="btn-icon btn-icon-sm hidden hover:text-danger group-hover:inline-flex"
        title="Delete"
        onClick={(e) => {
          e.stopPropagation()
          void remove()
        }}
      >
        <Trash2 size={12} />
      </button>
      <button
        className="btn-icon btn-icon-sm text-success/80 hover:bg-success/15 hover:text-success"
        title={runTitle}
        onClick={(e) => {
          e.stopPropagation()
          run()
        }}
      >
        {session?.kind === 'web' ? <ExternalLink size={12} /> : <Play size={12} />}
      </button>
    </li>
  )
}

/** Satirin sagindaki kisa ipucu: hedef adres ya da adim sayisi. */
function hint(session: TerminalDef | null, command: CommandDef | null): string {
  if (session) {
    if (session.kind === 'ssh') return session.host ?? ''
    return session.kind === 'web' ? '' : 'local'
  }
  const n = command?.steps.length ?? 0
  return `${n} step${n === 1 ? '' : 's'}`
}

function iconFor(session: TerminalDef | null): typeof Terminal {
  if (!session) return FileCode2
  if (session.kind === 'ssh') return Server
  if (session.kind === 'web') return Globe
  return Terminal
}

/** Dosyayi projeden kaldirir; oturumsa kasadaki sifreleri de siler. */
async function deleteFile(project: Project, kind: FileKind, defId: string): Promise<void> {
  useEditorStore.getState().closeForDef(defId)
  const { updateProject } = useAppStore.getState()

  if (kind === 'session') {
    await window.api.creds.removePrefix(`term:${defId}`)
    await updateProject({
      id: project.id,
      terminals: project.terminals.filter((t) => t.id !== defId)
    })
    return
  }
  await updateProject({
    id: project.id,
    commands: project.commands.filter((c) => c.id !== defId)
  })
}
