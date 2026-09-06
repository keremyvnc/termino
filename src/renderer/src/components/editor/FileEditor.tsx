import { useState } from 'react'
import { Code2, ExternalLink, FileCode2, Globe, LayoutList, Play, Server, Terminal } from 'lucide-react'
import type { CommandDef, Project, TerminalDef } from '@shared/types'
import { fileNameFor } from '@shared/projectYaml'
import { useAppStore } from '../../store/useAppStore'
import { useEditorStore, type EditorTab } from '../../store/useEditorStore'
import { useTerminalStore } from '../../store/useTerminalStore'
import { CommandForm } from './CommandForm'
import { findDef, folderLabel } from './fileDocument'
import { SessionForm } from './SessionForm'
import { targetLabel } from './stepText'
import { YamlView } from './YamlView'

type Mode = 'form' | 'yaml'

/**
 * Sol agactan secilen dosyanin editoru. Varsayilan gorunum anlasilir form;
 * "YAML" dugmesi ham dosyayi gosterir. ▶ komutu calistirir / oturumu acar.
 */
export function FileEditor({
  project,
  tab,
  visible
}: {
  project: Project
  tab: EditorTab
  visible: boolean
}) {
  const showToast = useAppStore((s) => s.showToast)
  const dirty = useEditorStore((s) => s.dirty[tab.id] ?? false)
  const [mode, setMode] = useState<Mode>('form')

  const def = findDef(project, tab)
  if (!def) {
    return (
      <div className="flex h-full items-center justify-center text-sm text-muted">
        Bu dosya artık yok.
      </div>
    )
  }

  const session = tab.kind === 'session' ? (def as TerminalDef) : undefined
  const command = tab.kind === 'command' ? (def as CommandDef) : undefined

  const switchMode = (next: Mode): void => {
    // YAML'da kaydedilmemis degisiklik varsa form, diskteki eski hali gosterirdi.
    if (mode === 'yaml' && next === 'form' && dirty) {
      showToast('Önce YAML değişikliklerini kaydet (Ctrl+S) ya da geri al.')
      return
    }
    setMode(next)
  }

  const run = (): void => {
    runLatest(project.id, tab).catch((e) => showToast(String((e as Error).message ?? e)))
  }

  const Icon = session ? (session.kind === 'ssh' ? Server : session.kind === 'web' ? Globe : Terminal) : FileCode2

  return (
    <div className="flex h-full flex-col" style={{ display: visible ? 'flex' : 'none' }}>
      <div className="flex h-10 shrink-0 items-center gap-3 border-b border-border bg-panel px-4 text-xs">
        <Icon size={14} className={session ? 'text-accent' : 'text-amber-300'} />
        <span className="text-sm font-semibold">{def.name}</span>
        {command && (
          <span className="rounded bg-panel-2 px-1.5 py-0.5 text-[11px] text-muted">
            {targetLabel(command, project)}
          </span>
        )}
        <span className="flex-1" />
        <div className="flex overflow-hidden rounded-md border border-border">
          <ModeButton active={mode === 'form'} onClick={() => switchMode('form')} title="Anlaşılır görünüm">
            <LayoutList size={12} /> Görünüm
          </ModeButton>
          <ModeButton
            active={mode === 'yaml'}
            onClick={() => switchMode('yaml')}
            title={`Ham dosya: ${folderLabel(tab.kind)}/${fileNameFor(def.name)}`}
          >
            <Code2 size={12} /> YAML
          </ModeButton>
        </div>
        <button className="btn btn-primary" onClick={run} title={runLabel(session, tab.kind)}>
          {session?.kind === 'web' ? <ExternalLink size={12} /> : <Play size={12} />}
          {runLabel(session, tab.kind)}
        </button>
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto">
        {mode === 'yaml' ? (
          <YamlView project={project} tab={tab} visible={visible} />
        ) : session ? (
          <SessionForm project={project} def={session} />
        ) : (
          <CommandForm project={project} cmd={command as CommandDef} />
        )}
      </div>
    </div>
  )
}

function ModeButton({
  active,
  onClick,
  title,
  children
}: {
  active: boolean
  onClick(): void
  title: string
  children: React.ReactNode
}) {
  return (
    <button
      className={`flex items-center gap-1 px-2 py-1 text-[11px] ${
        active ? 'bg-panel-2 text-fg' : 'text-muted hover:text-fg'
      }`}
      onClick={onClick}
      title={title}
    >
      {children}
    </button>
  )
}

function runLabel(session: TerminalDef | undefined, kind: EditorTab['kind']): string {
  if (kind !== 'session') return 'Çalıştır'
  return session?.kind === 'web' ? 'Tarayıcıda aç' : 'Bağlan'
}

/** Proje en guncel haliyle store'dan okunur; form degisiklikleri aninda gecerli olsun. */
async function runLatest(projectId: string, tab: EditorTab): Promise<void> {
  const project = useAppStore.getState().projects.find((p) => p.id === projectId)
  if (!project) return
  const def = findDef(project, tab)
  if (!def) throw new Error('Bu dosya artık yok.')

  const terminals = useTerminalStore.getState()
  if (tab.kind === 'session') await terminals.openDef(project, def as TerminalDef)
  else await terminals.runCommand(project, def as CommandDef)
}
