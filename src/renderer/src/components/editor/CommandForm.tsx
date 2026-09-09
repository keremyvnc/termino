import { DEFAULT_SHELL, SSH_SHELL, type CommandDef, type Project, type ShellKind } from '@shared/types'
import { countSteps } from '@shared/steps'
import { useAppStore } from '../../store/useAppStore'
import { useShellStore } from '../../store/useShellStore'
import { Field, FormSection, TextField } from './fields'
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
  const shells = useShellStore((s) => s.shells)

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
      patch({ target: value, shell: SSH_SHELL })
    }
  }

  // Baska bir makinede yazilmis komut: kabuk burada yoksa secim kaybolmasin diye gosterilir.
  const unknownShell =
    !cmd.target &&
    cmd.shell !== SSH_SHELL &&
    cmd.shell !== DEFAULT_SHELL &&
    !shells.some((s) => s.id === cmd.shell)

  const total = countSteps(project, cmd.steps)
  const sessions = project.terminals.filter((t) => t.kind !== 'web')

  return (
    <div className="mx-auto max-w-3xl space-y-4 p-5">
      <FormSection title="Command">
        <div className="grid grid-cols-2 gap-4">
          <Field label="Name" hint="Other commands can call this one by name.">
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
                <option value={`${LOCAL_PREFIX}${DEFAULT_SHELL}`}>
                  Default shell on each machine
                </option>
                {shells.map((shell) => (
                  <option key={shell.id} value={`${LOCAL_PREFIX}${shell.id}`}>
                    Local {shell.label}
                  </option>
                ))}
                {unknownShell && (
                  <option value={`${LOCAL_PREFIX}${cmd.shell}`}>
                    Local {cmd.shell} (not installed here)
                  </option>
                )}
                <option value={`${LOCAL_PREFIX}${SSH_SHELL}`}>Currently open SSH tab</option>
              </optgroup>
            </select>
          </Field>
        </div>

        <label className="flex cursor-pointer items-start gap-2 rounded-md border border-border bg-bg/40 px-2.5 py-2 text-xs text-muted hover:text-fg">
          <input
            type="checkbox"
            className="mt-0.5 accent-[#38bdf8]"
            checked={cmd.runInNewTab}
            onChange={(e) => patch({ runInNewTab: e.target.checked })}
          />
          <span>
            <span className="font-medium text-fg">Always open a new tab</span>
            <br />
            When off, the command is typed into the session tab that is already open.
          </span>
        </label>
      </FormSection>

      <FormSection
        title="Steps"
        description={
          total === null
            ? 'The step chain is invalid: a called command is missing or calls itself.'
            : `${total} step${total === 1 ? '' : 's'} run in order in ${targetLabel(cmd, project)}.`
        }
      >
        <StepsEditor
          steps={cmd.steps}
          project={project}
          excludeCommandId={cmd.id}
          onChange={(steps) => patch({ steps })}
        />
      </FormSection>
    </div>
  )
}
