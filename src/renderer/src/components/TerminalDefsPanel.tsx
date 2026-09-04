import { useEffect, useState } from 'react'
import { KeyRound, Pencil, Play, Plus, Server, Terminal, Trash2, Wand2, X } from 'lucide-react'
import type { Project, TerminalDef, TerminalKind } from '@shared/types'
import { newId } from '@shared/types'
import { parseScript, stringifyScript } from '@shared/script'
import { useAppStore } from '../store/useAppStore'
import { useTerminalStore } from '../store/useTerminalStore'

/** Atlama sunucusu uzerinden ikinci cihaza gecip su - olan zincir icin hazir senaryo. */
const JUMP_TEMPLATE = `# 1) ilk cihaza girildi, prompt bekle
expect: [$#] @15000
# 2) ikinci cihaza anahtarla atla (host key sorusu otomatik gecilir)
send: ssh -o StrictHostKeyChecking=no -i /home/tci/.ssh/id_rsa_kvm modman@10.1.1.8
expect: (?i)password: @20000
send: {{secret:kvm}}
expect: [$#] @15000
# 3) root ol
send: su -
expect: (?i)password: @10000
send: {{secret:su}}
expect: # @10000`

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
    // Baglanti sifresi ve tum ek sifreler (term:<id>:*) kasadan silinir.
    void window.api.creds.removePrefix(`term:${t.id}`)
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
          Tek tıkla açılacak SSH veya yerel oturumları burada tanımla. Zincirleme bağlantılar
          (atlama sunucusu, su) senaryo ile aynı oturumda yapılır.
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
                {t.secrets && t.secrets.length > 0 && (
                  <span className="ml-1 text-[10px]">+{t.secrets.length} şifre</span>
                )}
              </div>
            )}
          </li>
        ))}
      </ul>
    </div>
  )
}

interface SecretRow {
  name: string
  value: string
  stored: boolean
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
  const [secrets, setSecrets] = useState<SecretRow[]>(
    (def.secrets ?? []).map((name) => ({ name, value: '', stored: true }))
  )
  const [saving, setSaving] = useState(false)
  const credRef = def.credentialRef ?? `term:${def.id}`

  useEffect(() => {
    void window.api.creds.has(credRef).then(setHasSecret)
  }, [credRef])

  const valid = d.name.trim() && (d.kind === 'local' || (d.host && d.username))

  const secretKey = (name: string): string => `term:${def.id}:${name}`

  const submit = async (): Promise<void> => {
    setSaving(true)
    try {
      let credentialRef = d.credentialRef
      if (d.kind === 'ssh' && password) {
        await window.api.creds.set(credRef, password)
        credentialRef = credRef
      }
      if (d.kind === 'ssh' && !password && hasSecret) credentialRef = credRef

      const names: string[] = []
      for (const row of secrets) {
        const name = row.name.trim().replace(/[^\w-]/g, '_')
        if (!name) continue
        if (row.value) await window.api.creds.set(secretKey(name), row.value)
        else if (!row.stored) continue // ad var, deger yok, kayitli da degil: atla
        names.push(name)
      }
      // Silinen ek sifreleri kasadan da kaldir.
      for (const old of def.secrets ?? []) {
        if (!names.includes(old)) await window.api.creds.remove(secretKey(old))
      }

      onSave({ ...d, credentialRef, secrets: names, script: parseScript(scriptText) })
    } catch (e) {
      onError('Kaydedilemedi: ' + String((e as Error).message ?? e))
    } finally {
      setSaving(false)
    }
  }

  const applyTemplate = (): void => {
    setScriptText(JUMP_TEMPLATE)
    setSecrets((rows) => {
      const have = new Set(rows.map((r) => r.name))
      const add: SecretRow[] = []
      if (!have.has('kvm')) add.push({ name: 'kvm', value: '', stored: false })
      if (!have.has('su')) add.push({ name: 'su', value: '', stored: false })
      return [...rows, ...add]
    })
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
        placeholder="örn. KVM (10.1.1.1 üzerinden)"
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
                placeholder="10.1.1.1"
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
            Şifre{' '}
            {hasSecret && <span className="normal-case text-emerald-400">· kasada kayıtlı</span>}
          </label>
          <input
            className="input mb-2 font-mono"
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder={hasSecret ? 'değiştirmek için yaz' : 'bağlantı şifresi'}
            autoComplete="off"
          />
        </>
      )}

      <div className="mb-1 flex items-center justify-between">
        <label className="label mb-0">Ek şifreler (senaryo için)</label>
        <button
          className="btn-icon h-6 w-6"
          title="Ek şifre ekle"
          onClick={() => setSecrets((r) => [...r, { name: '', value: '', stored: false }])}
        >
          <Plus size={12} />
        </button>
      </div>
      {secrets.length === 0 && (
        <p className="mb-2 text-[11px] text-muted">
          İkinci cihazın veya <code className="font-mono">su</code> şifresi gibi değerler. Senaryoda{' '}
          <code className="font-mono">{'{{secret:ad}}'}</code> ile kullanılır.
        </p>
      )}
      {secrets.map((row, i) => (
        <div key={i} className="mb-1.5 grid grid-cols-[96px_1fr_28px] items-center gap-1.5">
          <input
            className="input font-mono text-xs"
            value={row.name}
            onChange={(e) =>
              setSecrets((r) => r.map((x, j) => (j === i ? { ...x, name: e.target.value } : x)))
            }
            placeholder="ad"
          />
          <input
            className="input font-mono text-xs"
            type="password"
            value={row.value}
            onChange={(e) =>
              setSecrets((r) => r.map((x, j) => (j === i ? { ...x, value: e.target.value } : x)))
            }
            placeholder={row.stored ? 'kasada kayıtlı · değiştirmek için yaz' : 'şifre'}
            autoComplete="off"
          />
          <button
            className="btn-icon h-6 w-6 hover:text-red-300"
            onClick={() => setSecrets((r) => r.filter((_, j) => j !== i))}
            title="Kaldır"
          >
            <X size={12} />
          </button>
        </div>
      ))}

      <div className="mb-1 mt-2 flex items-center justify-between">
        <label className="label mb-0">Bağlantı sonrası senaryo</label>
        <button className="btn" title="Atlama sunucusu + su - şablonunu doldur" onClick={applyTemplate}>
          <Wand2 size={12} /> Zincir şablonu
        </button>
      </div>
      <textarea
        className="input mb-1 h-32 resize-y font-mono text-xs"
        value={scriptText}
        onChange={(e) => setScriptText(e.target.value)}
        placeholder={'expect: [$#] @15000\nsend: ssh -i /home/tci/.ssh/id_rsa_kvm modman@10.1.1.8\nexpect: (?i)password:\nsend: {{secret:kvm}}'}
        spellCheck={false}
      />
      <p className="mb-2 text-[11px] leading-relaxed text-muted">
        Satır başına bir adım: <code className="font-mono">send:</code>,{' '}
        <code className="font-mono">expect:</code> (düzenli ifade, sonuna{' '}
        <code className="font-mono">@ms</code>), <code className="font-mono">wait:</code>,{' '}
        <code className="font-mono">#</code> yorum. Değişkenler: {'{{ip}}'}, {'{{gateway}}'},{' '}
        {'{{project}}'}, {'{{secret:ad}}'}.
      </p>
      <div className="flex justify-end gap-1">
        <button className="btn" onClick={onCancel}>
          Vazgeç
        </button>
        <button className="btn btn-primary" disabled={!valid || saving} onClick={() => void submit()}>
          Kaydet
        </button>
      </div>
    </div>
  )
}
