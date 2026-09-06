import { useState } from 'react'
import { KeyRound, Plus, X } from 'lucide-react'
import type { Project, TerminalDef } from '@shared/types'
import { useSessionSecrets } from './useSessionSecrets'

/** SSH oturumunun sifre cubugu. Kasa islemleri `useSessionSecrets` icindedir. */
export function SecretsBar({ def, project }: { def: TerminalDef; project: Project }) {
  const { hasPassword, savePassword, addSecret, removeSecret } = useSessionSecrets(project, def)
  const [password, setPassword] = useState('')
  const [adding, setAdding] = useState<{ name: string; value: string } | null>(null)

  const submitPassword = async (): Promise<void> => {
    if (await savePassword(password)) setPassword('')
  }

  const submitSecret = async (): Promise<void> => {
    if (adding && (await addSecret(adding.name, adding.value))) setAdding(null)
  }

  return (
    <div className="flex shrink-0 flex-wrap items-center gap-2 border-b border-border bg-panel-2/60 px-3 py-1.5 text-xs">
      <KeyRound size={12} className={hasPassword ? 'text-emerald-400' : 'text-muted'} />
      <span className="text-muted">Connection password{hasPassword ? ' · in vault' : ''}:</span>
      <input
        className="input w-44 py-0.5 font-mono text-xs"
        type="password"
        value={password}
        placeholder={hasPassword ? 'type to change' : 'password'}
        autoComplete="off"
        onChange={(e) => setPassword(e.target.value)}
        onKeyDown={(e) => e.key === 'Enter' && void submitPassword()}
      />
      {password && (
        <button className="btn btn-primary py-0.5" onClick={() => void submitPassword()}>
          Save
        </button>
      )}

      <span className="mx-1 h-4 border-l border-border" />
      <span className="text-muted">Extra secrets:</span>
      {(def.secrets ?? []).map((name) => (
        <span key={name} className="flex items-center gap-1 rounded bg-bg px-1.5 py-0.5 font-mono">
          {`{{secret:${name}}}`}
          <button
            className="text-muted hover:text-red-300"
            title="Remove"
            onClick={() => void removeSecret(name)}
          >
            <X size={10} />
          </button>
        </span>
      ))}

      {adding ? (
        <>
          <input
            className="input w-24 py-0.5 font-mono text-xs"
            placeholder="name"
            autoFocus
            value={adding.name}
            onChange={(e) => setAdding({ ...adding, name: e.target.value })}
          />
          <input
            className="input w-36 py-0.5 font-mono text-xs"
            type="password"
            placeholder="password"
            autoComplete="off"
            value={adding.value}
            onChange={(e) => setAdding({ ...adding, value: e.target.value })}
            onKeyDown={(e) => e.key === 'Enter' && void submitSecret()}
          />
          <button className="btn btn-primary py-0.5" onClick={() => void submitSecret()}>
            Add
          </button>
          <button className="btn-icon h-6 w-6" onClick={() => setAdding(null)}>
            <X size={12} />
          </button>
        </>
      ) : (
        <button
          className="btn-icon h-6 w-6"
          title="Add an extra secret (su, second device…)"
          onClick={() => setAdding({ name: '', value: '' })}
        >
          <Plus size={12} />
        </button>
      )}
    </div>
  )
}
