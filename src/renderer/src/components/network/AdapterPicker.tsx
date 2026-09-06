import { Unplug } from 'lucide-react'
import type { AdapterInfo } from '@shared/types'
import { statusColor } from '../AdapterList'

/** Profilin baglanacagi adaptoru sectirir ve secilenin durumunu gosterir. */
export function AdapterPicker({
  adapters,
  selectedMac,
  bound,
  onChange
}: {
  adapters: AdapterInfo[]
  selectedMac: string | null
  bound: AdapterInfo | undefined
  onChange: (mac: string | null) => void
}) {
  return (
    <>
      <select
        className="input"
        value={selectedMac ?? ''}
        onChange={(e) => onChange(e.target.value || null)}
        aria-label="Adapter"
      >
        <option value="">— choose an adapter —</option>
        {adapters.map((a) => (
          <option key={a.mac || a.name} value={a.mac}>
            {a.name} · {a.status}
            {a.ipv4[0] ? ` · ${a.ipv4[0]}` : ''}
          </option>
        ))}
        {selectedMac && !bound && <option value={selectedMac}>(not connected) {selectedMac}</option>}
      </select>
      <div className="mt-1.5 flex min-h-5 items-center gap-2 text-[11px] text-muted">
        <AdapterStatus bound={bound} selectedMac={selectedMac} />
      </div>
    </>
  )
}

function AdapterStatus({
  bound,
  selectedMac
}: {
  bound: AdapterInfo | undefined
  selectedMac: string | null
}) {
  if (bound) {
    return (
      <>
        <span className={`dot ${statusColor(bound.status)}`} />
        <span className="truncate" title={bound.description}>
          {bound.description}
        </span>
        <span className="ml-auto shrink-0 font-mono">
          {bound.ipv4[0] ?? '—'}
          {bound.dhcp ? ' · dhcp' : ''}
        </span>
      </>
    )
  }
  if (selectedMac) {
    return (
      <>
        <Unplug size={12} className="shrink-0 text-warn" />
        <span>Not plugged in right now. It is matched by MAC address once connected.</span>
      </>
    )
  }
  return <span>The profile is matched to the adapter by MAC address, so renaming it is safe.</span>
}
