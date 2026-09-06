import { useState } from 'react'
import { Check, KeyRound, Plus, X } from 'lucide-react'
import type { Project, TerminalDef } from '@shared/types'
import { useSessionSecrets } from './useSessionSecrets'

/** SSH oturumunun sifre alani. Kasa islemleri `useSessionSecrets` icindedir. */
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
    <div className="space-y-3">
      <div>
        <label className="label flex items-center gap-1.5" htmlFor="ssh-password">
          Login password
          {hasPassword ? (
            <span className="chip chip-success normal-case tracking-normal">
              <Check size={10} /> saved in vault
            </span>
          ) : (
            <span className="chip chip-warn normal-case tracking-normal">not saved</span>
          )}
        </label>
        <div className="flex gap-2">
          <input
            id="ssh-password"
            className="input max-w-xs font-mono"
            type="password"
            value={password}
            placeholder={hasPassword ? 'Type a new password to replace it' : 'Password for the SSH login'}
            autoComplete="off"
            onChange={(e) => setPassword(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && void submitPassword()}
          />
          <button className="btn btn-primary h-8" disabled={!password} onClick={() => void submitPassword()}>
            <KeyRound size={12} /> Save
          </button>
        </div>
      </div>

      <div>
        <div className="label">Extra secrets</div>
        <div className="flex flex-wrap items-center gap-1.5">
          {(def.secrets ?? []).length === 0 && !adding && (
            <span className="text-[11px] text-muted/80">None yet — e.g. a su or second-device password.</span>
          )}
          {(def.secrets ?? []).map((name) => (
            <span key={name} className="chip chip-muted h-6 gap-1.5 font-mono">
              {`{{secret:${name}}}`}
              <button
                className="text-muted hover:text-danger"
                title={`Remove secret "${name}"`}
                onClick={() => void removeSecret(name)}
              >
                <X size={11} />
              </button>
            </span>
          ))}

          {adding ? (
            <span className="flex items-center gap-1.5">
              <input
                className="input input-sm w-28 font-mono"
                placeholder="name (e.g. su)"
                autoFocus
                value={adding.name}
                onChange={(e) => setAdding({ ...adding, name: e.target.value })}
              />
              <input
                className="input input-sm w-40 font-mono"
                type="password"
                placeholder="value"
                autoComplete="off"
                value={adding.value}
                onChange={(e) => setAdding({ ...adding, value: e.target.value })}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') void submitSecret()
                  if (e.key === 'Escape') setAdding(null)
                }}
              />
              <button className="btn btn-primary" disabled={!adding.name || !adding.value} onClick={() => void submitSecret()}>
                Add
              </button>
              <button className="btn-icon btn-icon-sm" title="Cancel" onClick={() => setAdding(null)}>
                <X size={12} />
              </button>
            </span>
          ) : (
            <button className="btn" onClick={() => setAdding({ name: '', value: '' })}>
              <Plus size={12} /> Add secret
            </button>
          )}
        </div>
      </div>
    </div>
  )
}
