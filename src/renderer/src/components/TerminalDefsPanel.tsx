import { useEffect, useState } from 'react'
import { KeyRound, Pencil, Play, Plus, Server, Terminal, Trash2, X } from 'lucide-react'
import type { Project, TerminalDef, TerminalKind } from '@shared/types'
import { newId } from '@shared/types'
import { parseScript, stringifyScript } from '@shared/script'
import { useAppStore } from '../store/useAppStore'
import { useTerminalStore } from '../store/useTerminalStore'

export function TerminalDefsPanel({ project }: { project: Project }) {
  const updateProject = useAppStore((s) => s.updateProject)
  const showToast = useAppStore((s) => s.showToast)
  const open = useTerminalStore((s) => s.open)
  const [editing, setEditing] = useState<TerminalDef | null>(null)

  const save = (t: TerminalDef): void => {
    const exists = project.terminals.some((x) => x.id === t.id)
    const terminals = exists
      ? project.terminals.map((x) => (x.id === t.id ? t : x))
      : [...project.terminals, t]
    void updateProject({ id: project.id, terminals })
    setEditing(null)
  }
  const remove = (t: TerminalDef): void => {
    if (t.credentialRef) void window.api.creds.remove(t.credentialRef)
    void updateProject({ id: project.id, terminals: project.terminals.filter((x) => x.id !== t.id) })
  }
  const connect = (t: TerminalDef): void => {
    open(project.id, { def: t, project }).catch((e) => showToast(String(e)))
  }

  return (
    <div className="p-3">
      <div className="mb-2 flex items-center justify-between">
        <span className="text-[11px] font-semibold uppercase tracking-wider text-muted">
          Oturum tanımları
        </span>
        <button
          className="btn"
          onClick={() => setEditing({ id: newId(), name: '', kind: 'ssh', port: 22 })}
        >
          <Plus size={12} /> Ekle
        </button>
      </div>

      {editing && (
        <TerminalEditor
          key={editing.id}
          def={editing}
          onSave={save}
          onCancel={() => setEditing(null)}
          onError={showToast}
        />
      )}

      {project.terminals.length === 0 && !editing && (
        <p className="py-6 text-center text-xs text-muted">
          Tek tıkla açılacak SSH veya yerel oturumları burada tanımla.
        </p>
      )}

      <ul className="space-y-1.5">
        {project.terminals.map((t) => (
          <li key={t.id} className="group rounded-md border border-border bg-panel-2 px-2.5 py-2">
            <div className="flex items-center gap-2">
              <button
                className="btn-icon h-6 w-6 text-accent"
                title={t.kind === 'ssh' ? 'Bağlan' : 'Aç'}
                onClick={() => connect(t)}
              >
                <Play size={12} />
              </button>
              {t.kind === 'ssh' ? (
                <Server size={12} className="shrink-0 text-muted" />
              ) : (
                <Terminal size={12} className="shrink-0 text-muted" />
              )}
              <span className="truncate text-sm">{t.name || '(adsız)'}</span>
              {t.script && t.script.length > 0 && (
                <span
                  className="rounded bg-bg px-1 py-0.5 text-[10px] text-muted"
                  title={`${t.script.length} senaryo adımı`}
                >
                  {t.script.length} adım
                </span>
              )}
              <button
                className="btn-icon ml-auto h-6 w-6 opacity-0 group-hover:opacity-100"
                onClick={() => setEditing(t)}
              >
                <Pencil size={12} />
              </button>
              <button
                className="btn-icon h-6 w-6 opacity-0 group-hover:opacity-100 hover:text-red-300"
                onClick={() => remove(t)}
              >
                <Trash2 size={12} />
              </button>
            </div>
            {t.kind === 'ssh' && (
              <div className="mt-1 flex items-center gap-1 pl-8 font-mono text-[11px] text-muted">
                {t.username}@{t.host}:{t.port}
                {t.credentialRef && (
                  <KeyRound size={10} className="ml-1 text-emerald-400" aria-label="şifre kayıtlı" />
                )}
              </div>
            )}
          </li>
        ))}
      </ul>
    </div>
  )
}

function TerminalEditor({
  def,
  onSave,
  onCancel,
  onError
}: {
  def: TerminalDef
  onSave: (t: TerminalDef) => void
  onCancel: () => void
  onError: (msg: string) => void
}) {
  const [d, setD] = useState(def)
  const [password, setPassword] = useState('')
  const [hasSecret, setHasSecret] = useState(false)
  const [scriptText, setScriptText] = useState(stringifyScript(def.script))
  const [saving, setSaving] = useState(false)
  const credRef = def.credentialRef ?? `term:${def.id}`

  useEffect(() => {
    void window.api.creds.has(credRef).then(setHasSecret)
  }, [credRef])

  const valid = d.name.trim() && (d.kind === 'local' || (d.host && d.username))

  const submit = async (): Promise<void> => {
    setSaving(true)
    try {
      let credentialRef = d.credentialRef
      if (d.kind === 'ssh' && password) {
        await window.api.creds.set(credRef, password)
        credentialRef = credRef
      }
      if (d.kind === 'ssh' && !password && hasSecret) credentialRef = credRef
      onSave({ ...d, credentialRef, script: parseScript(scriptText) })
    } catch (e) {
      onError('Kaydedilemedi: ' + String((e as Error).message ?? e))
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="mb-3 rounded-md border border-accent/40 bg-panel-2 p-2.5">
      <div className="mb-2 flex items-center justify-between">
        <span className="text-xs font-medium">Oturum</span>
        <button className="btn-icon h-6 w-6" onClick={onCancel}>
          <X size={12} />
        </button>
      </div>
      <label className="label">Ad</label>
      <input
        className="input mb-2"
        autoFocus
        value={d.name}
        onChange={(e) => setD({ ...d, name: e.target.value })}
        placeholder="örn. Test cihazı"
      />
      <label className="label">Tür</label>
      <select
        className="input mb-2"
        value={d.kind}
        onChange={(e) => setD({ ...d, kind: e.target.value as TerminalKind })}
      >
        <option value="ssh">SSH</option>
        <option value="local">Yerel PowerShell</option>
      </select>
      {d.kind === 'ssh' && (
        <>
          <div className="grid grid-cols-[1fr_72px] gap-2">
            <div>
              <label className="label">Sunucu</label>
              <input
                className="input font-mono"
                value={d.host ?? ''}
                onChange={(e) => setD({ ...d, host: e.target.value.trim() })}
                placeholder="192.168.1.20"
              />
            </div>
            <div>
              <label className="label">Port</label>
              <input
                className="input font-mono"
                type="number"
                value={d.port ?? 22}
                onChange={(e) => setD({ ...d, port: Number(e.target.value) || 22 })}
              />
            </div>
          </div>
          <label className="label mt-2">Kullanıcı</label>
          <input
            className="input mb-2 font-mono"
            value={d.username ?? ''}
            onChange={(e) => setD({ ...d, username: e.target.value.trim() })}
            placeholder="root"
          />
          <label className="label">
            Şifre {hasSecret && <span className="normal-case text-emerald-400">· kasada kayıtlı</span>}
          </label>
          <input
            className="input mb-1 font-mono"
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder={hasSecret ? 'değiştirmek için yaz' : 'bağlantı şifresi'}
            autoComplete="off"
          />
          <p className="mb-2 text-[11px] text-muted">
            Windows DPAPI ile şifrelenir, proje dosyasına yazılmaz. Senaryoda{' '}
            <code className="font-mono">{'{{secret:' + credRef + '}}'}</code> ile kullanılabilir.
          </p>
        </>
      )}
      <label className="label">Bağlantı sonrası senaryo (opsiyonel)</label>
      <textarea
        className="input mb-1 h-24 resize-y font-mono text-xs"
        value={scriptText}
        onChange={(e) => setScriptText(e.target.value)}
        placeholder={'expect: \\$ @10000\nsend: cd /opt/test\nsend: ./run.sh {{ip}}'}
        spellCheck={false}
      />
      <p className="mb-2 text-[11px] text-muted">
        Satır başına bir adım: <code className="font-mono">send:</code>,{' '}
        <code className="font-mono">expect:</code> (regex, sonuna <code className="font-mono">@ms</code>),{' '}
        <code className="font-mono">wait:</code>. Değişkenler: {'{{ip}}'}, {'{{gateway}}'}, {'{{project}}'}.
      </p>
      <div className="flex justify-end gap-1">
        <button className="btn" onClick={onCancel}>
          Vazgeç
        </button>
        <button
          className="btn btn-primary"
          disabled={!valid || saving}
          onClick={() => void submit()}
        >
          Kaydet
        </button>
      </div>
    </div>
  )
}
