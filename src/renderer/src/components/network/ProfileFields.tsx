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
  const invalid = (ok: boolean): string => (ok ? '' : 'input-invalid')

  return (
    <div className="space-y-2.5">
      <div className="grid grid-cols-[1fr_72px] gap-2">
        <div>
          <label className="label" htmlFor="net-ip">
            IP address
          </label>
          <input
            id="net-ip"
            className={`input font-mono ${profile.ip ? invalid(validity.ip) : ''}`}
            value={profile.ip}
            placeholder="192.168.1.10"
            spellCheck={false}
            onChange={(e) => onChange({ ip: e.target.value.trim() })}
          />
        </div>
        <div>
          <label className="label" htmlFor="net-prefix">
            Prefix
          </label>
          <input
            id="net-prefix"
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
      <div className="-mt-1 font-mono text-[11px] text-muted">
        mask {prefixToMask(profile.prefixLength)}
        {profile.ip && !validity.ip && <span className="ml-2 text-danger">invalid IPv4 address</span>}
      </div>

      <div className="grid grid-cols-2 gap-2">
        <div>
          <label className="label" htmlFor="net-gw">
            Gateway <span className="normal-case tracking-normal text-muted/60">optional</span>
          </label>
          <input
            id="net-gw"
            className={`input font-mono ${invalid(validity.gateway)}`}
            value={profile.gateway ?? ''}
            spellCheck={false}
            onChange={(e) => onChange({ gateway: e.target.value.trim() || undefined })}
            placeholder="192.168.1.1"
          />
        </div>
        <div>
          <label className="label" htmlFor="net-dns">
            DNS <span className="normal-case tracking-normal text-muted/60">optional</span>
          </label>
          <input
            id="net-dns"
            className={`input font-mono ${invalid(validity.dns)}`}
            value={(profile.dns ?? []).join(', ')}
            spellCheck={false}
            onChange={(e) => onChange({ dns: splitList(e.target.value) })}
            placeholder="8.8.8.8, 1.1.1.1"
          />
        </div>
      </div>

      <label className="flex cursor-pointer items-start gap-2 rounded-md border border-border bg-bg/40 px-2.5 py-2 text-xs text-muted hover:text-fg">
        <input
          type="checkbox"
          className="mt-0.5 accent-[#38bdf8]"
          checked={profile.autoApply}
          onChange={(e) => onChange({ autoApply: e.target.checked })}
        />
        <span>
          <span className="font-medium text-fg">Auto-apply</span>
          <br />
          Apply this profile whenever the adapter is plugged in.
        </span>
      </label>
    </div>
  )
}

function splitList(value: string): string[] {
  return value
    .split(',')
    .map((part) => part.trim())
    .filter(Boolean)
}
