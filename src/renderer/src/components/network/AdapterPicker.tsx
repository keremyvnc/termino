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
      <label className="label mt-3">Adaptör</label>
      <select
        className="input mb-1"
        value={selectedMac ?? ''}
        onChange={(e) => onChange(e.target.value || null)}
      >
        <option value="">— seçilmedi —</option>
        {adapters.map((a) => (
          <option key={a.mac || a.name} value={a.mac}>
            {a.name} · {a.status}
          </option>
        ))}
        {selectedMac && !bound && <option value={selectedMac}>(bağlı değil) {selectedMac}</option>}
      </select>
      <div className="mb-3 flex items-center gap-2 text-[11px] text-muted">
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
        <span className={`h-1.5 w-1.5 shrink-0 rounded-full ${statusColor(bound.status)}`} />
        <span className="truncate">{bound.description}</span>
        <span className="ml-auto shrink-0 font-mono">
          {bound.ipv4[0] ?? '—'}
          {bound.dhcp ? ' dhcp' : ''}
        </span>
      </>
    )
  }
  if (selectedMac) {
    return (
      <>
        <Unplug size={12} className="shrink-0 text-amber-400" />
        Adaptör şu an takılı değil. Takıldığında MAC ile tanınacak.
      </>
    )
  }
  return <>Profili bir adaptöre bağla.</>
}
