import {
  Check,
  ExternalLink,
  FileCode2,
  Globe,
  KeyRound,
  Loader2,
  Pencil,
  Play,
  Plus,
  Server,
  Settings2,
  Terminal,
  Unplug,
  Zap
} from 'lucide-react'
import type { AdapterInfo, CommandDef, Project, TerminalDef } from '@shared/types'
import { useAppStore } from '../../store/useAppStore'
import { useEditorStore, type FileKind } from '../../store/useEditorStore'
import { useTerminalStore } from '../../store/useTerminalStore'
import { useUiStore } from '../../store/useUiStore'
import { isAlive } from '../../store/terminalTabs'
import { statusColor } from '../AdapterList'
import { targetLabel } from '../editor/stepText'
import { isProfileApplied, validateProfile } from '../network/profileValidation'
import { useNetworkOperations } from '../network/useNetworkOperations'
import { buildNewFile } from '../sidebar/newFileDefaults'
import { useVaultFlags } from './useVaultFlags'

/**
 * Proje ozeti: gunluk akisin tek ekrani. Ag durumu ve "Uygula", oturumlar
 * (Baglan) ve komutlar (Calistir) tek tikla erisilir. Toplu bir "baslat"
 * dugmesi yoktur; her satir kendi eylemini tasir.
 */
export function ProjectOverview({
  project,
  onOpenTerminal
}: {
  project: Project
  onOpenTerminal(): void
}) {
  const updateProject = useAppStore((s) => s.updateProject)
  const openEditor = useEditorStore((s) => s.open)

  const addFile = (kind: FileKind): void => {
    const { defId, patch } = buildNewFile(kind, project)
    void updateProject(patch)
    openEditor(project.id, kind, defId)
  }

  return (
    <div className="h-full overflow-y-auto">
      <div className="mx-auto max-w-4xl space-y-6 p-6">
        <NetworkCard project={project} />

        <Section
          title="Sessions"
          count={project.terminals.length}
          action={
            <button className="btn" onClick={() => addFile('session')}>
              <Plus size={12} /> New session
            </button>
          }
        >
          {project.terminals.length === 0 ? (
            <EmptyHint
              text="No sessions yet. A session is an SSH login, a local shell or a web address you open often."
              actionLabel="Add an SSH session"
              onAction={() => addFile('session')}
            />
          ) : (
            <SessionGrid project={project} />
          )}
        </Section>

        <Section
          title="Commands"
          count={project.commands.length}
          action={
            <button className="btn" onClick={() => addFile('command')}>
              <Plus size={12} /> New command
            </button>
          }
        >
          {project.commands.length === 0 ? (
            <EmptyHint
              text="No commands yet. A command is a list of steps (send, wait for output, wait) that runs in a session."
              actionLabel="Add a command"
              onAction={() => addFile('command')}
            />
          ) : (
            <CommandList project={project} />
          )}
        </Section>

        <div className="flex items-center gap-3 border-t border-border pt-4 text-xs text-muted">
          <button className="btn btn-ghost" onClick={onOpenTerminal}>
            <Terminal size={13} /> Open a plain PowerShell tab
          </button>
          <span className="flex-1" />
          <span>Tip: double-click a file in the tree to run it.</span>
        </div>
      </div>
    </div>
  )
}

function Section({
  title,
  count,
  action,
  children
}: {
  title: string
  count: number
  action: React.ReactNode
  children: React.ReactNode
}) {
  return (
    <section>
      <div className="mb-2 flex items-center gap-2">
        <h2 className="card-title">
          {title} <span className="font-normal text-muted/70">{count}</span>
        </h2>
        <span className="flex-1" />
        {action}
      </div>
      {children}
    </section>
  )
}

function EmptyHint({
  text,
  actionLabel,
  onAction
}: {
  text: string
  actionLabel: string
  onAction(): void
}) {
  return (
    <div className="flex items-center justify-between gap-4 rounded-lg border border-dashed border-border px-4 py-4 text-xs text-muted">
      <span className="leading-relaxed">{text}</span>
      <button className="btn btn-primary shrink-0" onClick={onAction}>
        <Plus size={12} /> {actionLabel}
      </button>
    </div>
  )
}

/* ---------------- Ag karti ---------------- */

function NetworkCard({ project }: { project: Project }) {
  const adapters = useAppStore((s) => s.adapters)
  const openPanel = useUiStore((s) => s.setNetworkPanel)
  const profile = project.network
  const { busy, run } = useNetworkOperations(project.id, profile)

  const bound = adapters.find((a) => a.mac === profile.adapterMac)
  const applied = isProfileApplied(bound, profile)
  const valid = validateProfile(profile).all
  const canApply = Boolean(bound) && valid && !busy

  return (
    <div className="card flex items-center gap-4 px-4 py-3">
      <span
        className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-full ${
          applied ? 'bg-success/15 text-success' : bound ? 'bg-warn/15 text-warn' : 'bg-panel-3 text-muted'
        }`}
      >
        {applied ? <Check size={17} /> : bound ? <Zap size={17} /> : <Unplug size={17} />}
      </span>

      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2 text-sm font-medium">
          <span className="font-mono">{profile.ip}/{profile.prefixLength}</span>
          <NetworkStatusChip bound={bound} applied={applied} hasMac={Boolean(profile.adapterMac)} />
        </div>
        <div className="mt-0.5 flex items-center gap-1.5 text-xs text-muted">
          {bound ? (
            <>
              <span className={`dot ${statusColor(bound.status)}`} />
              <span>{bound.name}</span>
              <span className="font-mono">· now {bound.ipv4[0] ?? bound.status}{bound.dhcp ? ' (dhcp)' : ''}</span>
            </>
          ) : profile.adapterMac ? (
            <span>Bound adapter is not plugged in. It is recognized by MAC when connected.</span>
          ) : (
            <span>No adapter bound yet. Choose one in the network panel.</span>
          )}
        </div>
      </div>

      <button className="btn" onClick={() => openPanel(true)} title="Edit the network profile">
        <Settings2 size={13} /> Edit
      </button>
      <button
        className={`btn h-8 ${applied ? 'btn-success' : 'btn-primary'}`}
        disabled={!canApply}
        onClick={() => void run('apply')}
        title={
          !profile.adapterMac
            ? 'Bind an adapter first'
            : !bound
              ? 'Adapter is not connected'
              : applied
                ? 'Already applied'
                : 'Windows will ask for administrator approval'
        }
      >
        {busy === 'apply' ? <Loader2 size={13} className="animate-spin" /> : applied ? <Check size={13} /> : <Zap size={13} />}
        {applied ? 'Applied' : 'Apply IP'}
      </button>
    </div>
  )
}

function NetworkStatusChip({
  bound,
  applied,
  hasMac
}: {
  bound: AdapterInfo | undefined
  applied: boolean
  hasMac: boolean
}) {
  if (applied) return <span className="chip chip-success">applied</span>
  if (bound) return <span className="chip chip-warn">not applied</span>
  if (hasMac) return <span className="chip chip-muted">adapter unplugged</span>
  return <span className="chip chip-muted">no adapter</span>
}

/* ---------------- Oturumlar ---------------- */

function SessionGrid({ project }: { project: Project }) {
  const vault = useVaultFlags(project.terminals)
  return (
    <div className="grid grid-cols-2 gap-2.5 xl:grid-cols-3">
      {project.terminals.map((def) => (
        <SessionCard key={def.id} project={project} def={def} hasPassword={vault[def.id]} />
      ))}
    </div>
  )
}

function SessionCard({
  project,
  def,
  hasPassword
}: {
  project: Project
  def: TerminalDef
  hasPassword: boolean | undefined
}) {
  const showToast = useAppStore((s) => s.showToast)
  const openEditor = useEditorStore((s) => s.open)
  const running = useTerminalStore((s) =>
    s.tabs.some((t) => t.createOpts.defId === def.id && isAlive(t, project.id))
  )

  const connect = (): void => {
    useTerminalStore
      .getState()
      .openDef(project, def)
      .catch((e) => showToast(String((e as Error).message ?? e), 'error'))
  }

  const Icon = def.kind === 'ssh' ? Server : def.kind === 'web' ? Globe : Terminal
  const subtitle =
    def.kind === 'ssh'
      ? `${def.username || '?'}@${def.host || '?'}${def.port && def.port !== 22 ? `:${def.port}` : ''}`
      : def.kind === 'web'
        ? def.url || 'no address'
        : 'Local PowerShell'
  const actionLabel = def.kind === 'web' ? 'Open' : running ? 'Show' : 'Connect'

  return (
    <div className="card group flex flex-col gap-2 p-3 transition-colors hover:border-border-strong">
      <div className="flex items-start gap-2.5">
        <span className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-md bg-accent/10 text-accent">
          <Icon size={14} />
        </span>
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-1.5">
            <span className="truncate text-sm font-medium">{def.name}</span>
            {running && <span className="dot bg-success" title="Session is open" />}
          </div>
          <div className="truncate font-mono text-[11px] text-muted" title={subtitle}>
            {subtitle}
          </div>
        </div>
        <button
          className="btn-icon btn-icon-sm opacity-0 group-hover:opacity-100"
          title="Edit session"
          onClick={() => openEditor(project.id, 'session', def.id)}
        >
          <Pencil size={12} />
        </button>
      </div>

      <div className="flex items-center gap-1.5">
        {def.kind === 'ssh' && (
          <span
            className={`chip ${hasPassword ? 'chip-muted' : 'chip-warn'}`}
            title={hasPassword ? 'Password is stored in the vault' : 'No password saved — you will be asked when connecting'}
          >
            <KeyRound size={10} /> {hasPassword === undefined ? '…' : hasPassword ? 'password saved' : 'no password'}
          </span>
        )}
        {def.script && def.script.length > 0 && (
          <span className="chip chip-muted" title="Steps that run automatically after connecting">
            {def.script.length} auto step{def.script.length === 1 ? '' : 's'}
          </span>
        )}
        <span className="flex-1" />
        <button className={`btn ${running ? '' : 'btn-primary'}`} onClick={connect}>
          {def.kind === 'web' ? <ExternalLink size={12} /> : <Play size={12} />}
          {actionLabel}
        </button>
      </div>
    </div>
  )
}

/* ---------------- Komutlar ---------------- */

function CommandList({ project }: { project: Project }) {
  return (
    <ul className="card divide-y divide-border">
      {project.commands.map((cmd) => (
        <CommandRow key={cmd.id} project={project} cmd={cmd} />
      ))}
    </ul>
  )
}

function CommandRow({ project, cmd }: { project: Project; cmd: CommandDef }) {
  const showToast = useAppStore((s) => s.showToast)
  const openEditor = useEditorStore((s) => s.open)

  const run = (): void => {
    useTerminalStore
      .getState()
      .runCommand(project, cmd)
      .catch((e) => showToast(String((e as Error).message ?? e), 'error'))
  }

  const firstSend = cmd.steps.find((s) => s.type === 'send')
  const n = cmd.steps.length

  return (
    <li className="group flex items-center gap-3 px-3 py-2 hover:bg-panel-2/60">
      <FileCode2 size={14} className="shrink-0 text-warn" />
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2">
          <span className="truncate text-sm font-medium">{cmd.name}</span>
          <span className="chip chip-muted">{n} step{n === 1 ? '' : 's'}</span>
        </div>
        <div className="truncate text-[11px] text-muted">
          <span>{targetLabel(cmd, project)}</span>
          {firstSend && firstSend.type === 'send' && firstSend.text && (
            <span className="font-mono"> · $ {firstSend.text}</span>
          )}
        </div>
      </div>
      <button
        className="btn-icon btn-icon-sm opacity-0 group-hover:opacity-100"
        title="Edit command"
        onClick={() => openEditor(project.id, 'command', cmd.id)}
      >
        <Pencil size={12} />
      </button>
      <button className="btn btn-primary" onClick={run} disabled={n === 0} title={n === 0 ? 'Add steps first' : 'Run'}>
        <Play size={12} /> Run
      </button>
    </li>
  )
}
