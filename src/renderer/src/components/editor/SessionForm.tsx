import type { Project, TerminalDef, TerminalKind } from '@shared/types'
import { useAppStore } from '../../store/useAppStore'
import { Field, NumberField, TextField } from './fields'
import { SecretsBar } from './SecretsBar'
import { StepsEditor } from './StepsEditor'

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
    <div className="mx-auto max-w-3xl space-y-5 p-5">
      <div className="grid grid-cols-[1fr_200px] gap-4">
        <Field label="Oturum adı">
          <TextField value={def.name} onCommit={(name) => name.trim() && patch({ name: name.trim() })} />
        </Field>
        <Field label="Tür">
          <select
            className="input"
            value={def.kind}
            onChange={(e) => patch({ kind: e.target.value as TerminalKind })}
          >
            <option value="ssh">SSH</option>
            <option value="local">Yerel PowerShell</option>
            <option value="web">Web adresi (tarayıcıda aç)</option>
          </select>
        </Field>
      </div>

      {def.kind === 'ssh' && (
        <div className="grid grid-cols-[1fr_100px_1fr] gap-4">
          <Field label="Sunucu">
            <TextField mono value={def.host ?? ''} placeholder="10.1.1.1" onCommit={(host) => patch({ host: host.trim() })} />
          </Field>
          <Field label="Port">
            <NumberField value={def.port ?? 22} min={1} onCommit={(port) => patch({ port: port || 22 })} />
          </Field>
          <Field label="Kullanıcı">
            <TextField mono value={def.username ?? ''} placeholder="root" onCommit={(username) => patch({ username: username.trim() })} />
          </Field>
        </div>
      )}

      {def.kind === 'web' && (
        <Field label="Adres">
          <TextField
            mono
            value={def.url ?? ''}
            placeholder="http://10.1.1.1 veya https://cihaz.local/admin"
            onCommit={(url) => patch({ url: url.trim() })}
          />
        </Field>
      )}

      {def.kind === 'ssh' && (
        <div className="overflow-hidden rounded-md border border-border">
          <SecretsBar def={def} project={project} />
        </div>
      )}

      {def.kind !== 'web' && (
        <div>
          <div className="label">Bağlanınca otomatik yapılacaklar</div>
          <p className="mb-2 text-[11px] text-muted">
            Örn. atlama sunucusundan ikinci cihaza <code className="font-mono">ssh</code>, ardından{' '}
            <code className="font-mono">su -</code>. Şifre satırları (<code className="font-mono">{'{{secret:ad}}'}</code>)
            şifre istemi gelince gönderilir.
          </p>
          <StepsEditor steps={def.script ?? []} project={project} onChange={(script) => patch({ script })} />
        </div>
      )}
    </div>
  )
}
