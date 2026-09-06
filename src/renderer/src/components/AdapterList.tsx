import { Cable, RefreshCw } from 'lucide-react'
import { useAppStore } from '../store/useAppStore'

export function statusColor(status: string): string {
  if (status === 'Up') return 'bg-emerald-400'
  if (status === 'Disconnected') return 'bg-amber-400'
  return 'bg-zinc-500'
}

export function AdapterList() {
  const adapters = useAppStore((s) => s.adapters)
  const refresh = useAppStore((s) => s.refreshAdapters)
  const projects = useAppStore((s) => s.projects)

  const usedBy = (mac: string): string | undefined =>
    projects.find((p) => p.network.adapterMac === mac)?.name

  return (
    <div className="flex max-h-64 shrink-0 flex-col border-t border-border">
      <div className="section-title">
        <span className="flex items-center gap-1.5">
          <Cable size={12} /> Adapters
        </span>
        <button className="btn-icon" title="Refresh" onClick={() => void refresh()}>
          <RefreshCw size={12} />
        </button>
      </div>
      <ul className="min-h-0 flex-1 overflow-y-auto px-2 pb-2">
        {adapters.map((a) => (
          <li
            key={a.mac || a.name}
            className="mb-0.5 rounded-md px-2 py-1 text-xs"
            title={`${a.description}\n${a.mac}`}
          >
            <div className="flex items-center gap-2">
              <span className={`h-1.5 w-1.5 shrink-0 rounded-full ${statusColor(a.status)}`} />
              <span className="truncate">{a.name}</span>
              {usedBy(a.mac) && (
                <span className="ml-auto truncate text-[10px] text-accent">{usedBy(a.mac)}</span>
              )}
            </div>
            <div className="pl-3.5 font-mono text-[10px] text-muted">
              {a.ipv4[0] ?? (a.status === 'Up' ? '—' : a.status)}
              {a.dhcp && a.ipv4[0] ? ' · dhcp' : ''}
            </div>
          </li>
        ))}
      </ul>
    </div>
  )
}
