import type { NetworkProfile } from '@shared/types'
import { clampPrefixLength, prefixToMask } from '@shared/net'
import type { ProfileValidity } from './profileValidation'

const DEFAULT_PREFIX = 24

/** IP / prefix / ag gecidi / DNS / otomatik uygulama alanlari. */
export function ProfileFields({
  profile,
  validity,
  onChange
}: {
  profile: NetworkProfile
  validity: ProfileValidity
  onChange: (patch: Partial<NetworkProfile>) => void
}) {
  const invalid = (ok: boolean): string => (ok ? '' : 'border-red-500/60')

  return (
    <>
      <div className="grid grid-cols-[1fr_88px] gap-2">
        <div>
          <label className="label">IP address</label>
          <input
            className={`input font-mono ${profile.ip ? invalid(validity.ip) : ''}`}
            value={profile.ip}
            onChange={(e) => onChange({ ip: e.target.value.trim() })}
          />
        </div>
        <div>
          <label className="label">Prefix</label>
          <input
            className="input font-mono"
            type="number"
            min={1}
            max={32}
            value={profile.prefixLength}
            onChange={(e) =>
              onChange({ prefixLength: clampPrefixLength(Number(e.target.value) || DEFAULT_PREFIX) })
            }
          />
        </div>
      </div>
      <div className="mb-2 mt-1 font-mono text-[11px] text-muted">
        mask {prefixToMask(profile.prefixLength)}
      </div>

      <label className="label">Gateway (optional)</label>
      <input
        className={`input mb-2 font-mono ${invalid(validity.gateway)}`}
        value={profile.gateway ?? ''}
        onChange={(e) => onChange({ gateway: e.target.value.trim() || undefined })}
        placeholder="192.168.1.1"
      />

      <label className="label">DNS (comma-separated)</label>
      <input
        className={`input mb-3 font-mono ${invalid(validity.dns)}`}
        value={(profile.dns ?? []).join(', ')}
        onChange={(e) => onChange({ dns: splitList(e.target.value) })}
        placeholder="8.8.8.8, 1.1.1.1"
      />

      <label className="mb-3 flex items-center gap-2 text-xs text-muted">
        <input
          type="checkbox"
          checked={profile.autoApply}
          onChange={(e) => onChange({ autoApply: e.target.checked })}
        />
        Apply automatically when the adapter is connected
      </label>
    </>
  )
}

function splitList(value: string): string[] {
  return value
    .split(',')
    .map((part) => part.trim())
    .filter(Boolean)
}
