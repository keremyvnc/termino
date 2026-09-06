import type { CommandDef, Project, ShellKind } from '@shared/types'
import { countSteps } from '@shared/steps'
import { useAppStore } from '../../store/useAppStore'
import { Field, TextField } from './fields'
import { StepsEditor } from './StepsEditor'
import { targetLabel } from './stepText'

/** Hedef secimi: oturum adi ya da yerel kabuk. `__local:` onekiyle ayirt edilir. */
const LOCAL_PREFIX = '__local:'

/**
 * Komut dosyasinin form gorunumu. Her degisiklik dogrudan projeye (dolayisiyla
 * diske) yazilir; kullanici YAML gormeden komutun ne yaptigini okur ve duzenler.
 */
export function CommandForm({ project, cmd }: { project: Project; cmd: CommandDef }) {
  const updateProject = useAppStore((s) => s.updateProject)

  const patch = (changes: Partial<CommandDef>): void => {
    void updateProject({
      id: project.id,
      commands: project.commands.map((c) => (c.id === cmd.id ? { ...c, ...changes } : c))
    })
  }

  const targetValue = cmd.target ?? `${LOCAL_PREFIX}${cmd.shell}`
  const onTarget = (value: string): void => {
    if (value.startsWith(LOCAL_PREFIX)) {
      patch({ target: undefined, shell: value.slice(LOCAL_PREFIX.length) as ShellKind })
    } else {
      patch({ target: value, shell: 'ssh' })
    }
  }

  const total = countSteps(project, cmd.steps)
  const sessions = project.terminals.filter((t) => t.kind !== 'web')

  return (
    <div className="mx-auto max-w-3xl space-y-5 p-5">
      <div className="grid grid-cols-[1fr_1fr] gap-4">
        <Field label="Command name">
          <TextField value={cmd.name} onCommit={(name) => name.trim() && patch({ name: name.trim() })} />
        </Field>
        <Field label="Where to run">
          <select className="input" value={targetValue} onChange={(e) => onTarget(e.target.value)}>
            {sessions.length > 0 && (
              <optgroup label="Sessions">
                {sessions.map((t) => (
                  <option key={t.id} value={t.name}>
                    {t.name}
                    {t.kind === 'ssh' ? ` (${t.username}@${t.host})` : ' (local)'}
                  </option>
                ))}
              </optgroup>
            )}
            <optgroup label="Local">
              <option value={`${LOCAL_PREFIX}powershell`}>Local PowerShell</option>
              <option value={`${LOCAL_PREFIX}cmd`}>Local CMD</option>
              <option value={`${LOCAL_PREFIX}ssh`}>Currently open SSH tab</option>
            </optgroup>
          </select>
        </Field>
      </div>

      <label className="flex items-center gap-2 text-xs text-muted">
        <input
          type="checkbox"
          checked={cmd.runInNewTab}
          onChange={(e) => patch({ runInNewTab: e.target.checked })}
        />
        Open a new tab on every run (when off, the open session is reused)
      </label>

      <div className="rounded-md border border-accent/30 bg-accent/5 px-3 py-2 text-xs">
        <span className="text-muted">Summary: </span>
        <span className="font-medium">
          {total === null ? 'invalid step chain' : `${total} step${total === 1 ? '' : 's'}`}
        </span>
        <span className="text-muted"> run in order in </span>
        <span className="font-medium">{targetLabel(cmd, project)}</span>
        <span className="text-muted">.</span>
      </div>

      <div>
        <div className="label">Steps</div>
        <StepsEditor
          steps={cmd.steps}
          project={project}
          excludeCommandId={cmd.id}
          onChange={(steps) => patch({ steps })}
        />
      </div>
    </div>
  )
}
