import { useState } from 'react'
import { ExternalLink, FileCode2, Globe, Play, Server, Terminal, Trash2 } from 'lucide-react'
import type { CommandDef, Project, TerminalDef } from '@shared/types'
import { useAppStore } from '../../store/useAppStore'
import { describeCommand, describeSession } from '../editor/stepText'
import { useEditorStore, type FileKind } from '../../store/useEditorStore'
import { useTerminalStore } from '../../store/useTerminalStore'

/** Yanlislikla silmeyi onlemek icin ikinci tiklama beklenir. */
const CONFIRM_WINDOW_MS = 3000

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
  const [confirming, setConfirming] = useState(false)

  const session = kind === 'session' ? (item as TerminalDef) : null
  const selected = activeId === `${kind}:${item.id}`

  const run = (): void => {
    const terminals = useTerminalStore.getState()
    const started = session
      ? terminals.openDef(project, session)
      : terminals.runCommand(project, item as CommandDef)
    started.catch((e) => showToast(String((e as Error).message ?? e)))
  }

  const remove = (): void => {
    if (!confirming) {
      setConfirming(true)
      setTimeout(() => setConfirming(false), CONFIRM_WINDOW_MS)
      return
    }
    void deleteFile(project, kind, item.id)
  }

  const Icon = iconFor(session)

  return (
    <li
      className={`group flex cursor-pointer items-center gap-1.5 rounded-md py-1 pl-1.5 pr-1 text-xs ${
        selected ? 'bg-panel-2 text-fg' : 'text-muted hover:bg-panel-2/60 hover:text-fg'
      }`}
      onClick={() => openEditor(project.id, kind, item.id)}
      onDoubleClick={run}
      title={
        session ? describeSession(session, project) : describeCommand(item as CommandDef, project)
      }
    >
      <Icon size={12} className={`shrink-0 ${session ? 'text-accent' : 'text-amber-300'}`} />
      <span className="truncate">{item.name}</span>
      {!session && (
        <span className="shrink-0 text-[10px] text-muted/70">{(item as CommandDef).steps.length}</span>
      )}
      <span className="flex-1" />
      <button
        className={`btn-icon h-5 w-5 opacity-0 group-hover:opacity-100 ${
          confirming ? 'text-red-300 opacity-100' : ''
        }`}
        title={confirming ? 'Silmek için tekrar tıkla' : 'Sil'}
        onClick={(e) => {
          e.stopPropagation()
          remove()
        }}
      >
        <Trash2 size={11} />
      </button>
      <button
        className="btn-icon h-5 w-5 text-emerald-400 hover:bg-emerald-400/15"
        title={session ? (session.kind === 'web' ? 'Tarayıcıda aç' : 'Bağlan') : 'Çalıştır'}
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
