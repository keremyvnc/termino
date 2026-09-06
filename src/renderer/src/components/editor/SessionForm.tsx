import type { Project, TerminalDef, TerminalKind } from '@shared/types'
import { useAppStore } from '../../store/useAppStore'
import { Field, FormSection, NumberField, TextField } from './fields'
import { SecretsBar } from './SecretsBar'
import { StepsEditor } from './StepsEditor'

const KIND_LABELS: { value: TerminalKind; label: string; hint: string }[] = [
  { value: 'ssh', label: 'SSH', hint: 'Log in to a device over SSH' },
  { value: 'local', label: 'Local PowerShell', hint: 'A PowerShell tab on this PC' },
  { value: 'web', label: 'Web address', hint: 'Open a page in the browser' }
]

/**
 * Oturum dosyasinin form gorunumu: tur, baglanti bilgileri, sifreler (kasa)
 * ve baglaninca otomatik yapilacak adimlar. Degisiklikler dogrudan projeye yazilir.
 */
export function SessionForm({ project, def }: { project: Project; def: TerminalDef }) {
  const updateProject = useAppStore((s) => s.updateProject)

  const patch = (changes: Partial<TerminalDef>): void => {
    void updateProject({
      id: project.id,
      terminals: project.terminals.map((t) => (t.id === def.id ? { ...t, ...changes } : t))
    })
  }

  return (
    <div className="mx-auto max-w-3xl space-y-4 p-5">
      <FormSection title="Session">
        <div className="grid grid-cols-[1fr_auto] gap-4">
          <Field label="Name" hint="Commands refer to the session by this name.">
            <TextField value={def.name} onCommit={(name) => name.trim() && patch({ name: name.trim() })} />
          </Field>
          <Field label="Type">
            <div className="flex h-8 overflow-hidden rounded-md border border-border" role="radiogroup">
              {KIND_LABELS.map((k) => (
                <button
                  key={k.value}
                  role="radio"
                  aria-checked={def.kind === k.value}
                  title={k.hint}
                  className={`px-3 text-xs transition-colors ${
                    def.kind === k.value ? 'bg-accent/15 text-accent' : 'text-muted hover:bg-panel-2 hover:text-fg'
                  }`}
                  onClick={() => patch({ kind: k.value })}
                >
                  {k.label}
                </button>
              ))}
            </div>
          </Field>
        </div>
      </FormSection>

      {def.kind === 'ssh' && (
        <FormSection title="Connection">
          <div className="grid grid-cols-[1fr_90px_1fr] gap-4">
            <Field label="Host">
              <TextField mono value={def.host ?? ''} placeholder="10.1.1.1" onCommit={(host) => patch({ host: host.trim() })} />
            </Field>
            <Field label="Port">
              <NumberField value={def.port ?? 22} min={1} onCommit={(port) => patch({ port: port || 22 })} />
            </Field>
            <Field label="Username">
              <TextField mono value={def.username ?? ''} placeholder="root" onCommit={(username) => patch({ username: username.trim() })} />
            </Field>
          </div>
          <p className="text-[11px] text-muted/80">
            Tip: use <code className="font-mono text-fg">{'{{ip}}'}</code> as the host to follow the project's network profile.
          </p>
        </FormSection>
      )}

      {def.kind === 'web' && (
        <FormSection title="Address">
          <Field label="URL">
            <TextField
              mono
              value={def.url ?? ''}
              placeholder="http://10.1.1.1 or https://device.local/admin"
              onCommit={(url) => patch({ url: url.trim() })}
            />
          </Field>
        </FormSection>
      )}

      {def.kind === 'ssh' && (
        <FormSection
          title="Passwords"
          description="Stored encrypted in the Windows vault, never in the YAML file. Extra secrets can be used in steps as {{secret:name}}."
        >
          <SecretsBar def={def} project={project} />
        </FormSection>
      )}

      {def.kind !== 'web' && (
        <FormSection
          title="After connecting"
          description="Steps that run automatically once the session is open — e.g. ssh from a jump host to a second device, then su -. Password lines are sent when the prompt appears."
        >
          <StepsEditor steps={def.script ?? []} project={project} onChange={(script) => patch({ script })} />
        </FormSection>
      )}
    </div>
  )
}
