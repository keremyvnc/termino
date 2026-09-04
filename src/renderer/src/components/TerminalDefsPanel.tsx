import { useState } from 'react'
import { KeyRound, Pencil, Plus, Server, Trash2, X } from 'lucide-react'
import type { Project, TerminalDef, TerminalKind } from '@shared/types'
import { newId } from '@shared/types'
import { useAppStore } from '../store/useAppStore'

export function TerminalDefsPanel({ project }: { project: Project }) {
  const updateProject = useAppStore((s) => s.updateProject)
  const showToast = useAppStore((s) => s.showToast)
  const [editing, setEditing] = useState<TerminalDef | null>(null)

  const save = (t: TerminalDef): void => {
    const exists = project.terminals.some((x) => x.id === t.id)
    const terminals = exists
      ? project.terminals.map((x) => (x.id === t.id ? t : x))
      : [...project.terminals, t]
    void updateProject({ id: project.id, terminals })
    setEditing(null)
  }
  const remove = (id: string): void => {
    void updateProject({ id: project.id, terminals: project.terminals.filter((x) => x.id !== id) })
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

      {editing && <TerminalEditor def={editing} onSave={save} onCancel={() => setEditing(null)} />}

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
                title="Bağlan (Asama 4)"
                onClick={() => showToast('SSH oturumu 4. aşamada geliyor.')}
              >
                <Server size={12} />
              </button>
              <span className="truncate text-sm">{t.name || '(adsız)'}</span>
              <span className="ml-auto rounded bg-bg px-1.5 py-0.5 text-[10px] uppercase text-muted">
                {t.kind}
              </span>
              <button className="btn-icon h-6 w-6 opacity-0 group-hover:opacity-100" onClick={() => setEditing(t)}>
                <Pencil size={12} />
              </button>
              <button
                className="btn-icon h-6 w-6 opacity-0 group-hover:opacity-100 hover:text-red-300"
                onClick={() => remove(t.id)}
              >
                <Trash2 size={12} />
              </button>
            </div>
            {t.kind === 'ssh' && (
              <div className="mt-1 flex items-center gap-1 pl-8 font-mono text-[11px] text-muted">
                {t.username}@{t.host}:{t.port}
                {t.credentialRef && <KeyRound size={10} className="ml-1 text-emerald-400" />}
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
  onCancel
}: {
  def: TerminalDef
  onSave: (t: TerminalDef) => void
  onCancel: () => void
}) {
  const [d, setD] = useState(def)
  const valid = d.name.trim() && (d.kind === 'local' || (d.host && d.username))
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
          <p className="mb-2 text-[11px] text-muted">
            Şifre 4. aşamada şifreli kasaya kaydedilecek, JSON'a yazılmayacak.
          </p>
        </>
      )}
      <div className="flex justify-end gap-1">
        <button className="btn" onClick={onCancel}>
          Vazgeç
        </button>
        <button className="btn btn-primary" disabled={!valid} onClick={() => onSave(d)}>
          Kaydet
        </button>
      </div>
    </div>
  )
}
