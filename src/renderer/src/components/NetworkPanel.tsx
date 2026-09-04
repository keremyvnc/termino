import { Unplug, Zap } from 'lucide-react'
import type { NetworkProfile, Project } from '@shared/types'
import { useAppStore } from '../store/useAppStore'
import { statusColor } from './AdapterList'

const IP_RE = /^(25[0-5]|2[0-4]\d|1?\d?\d)(\.(25[0-5]|2[0-4]\d|1?\d?\d)){3}$/

export function prefixToMask(prefix: number): string {
  const bits = prefix <= 0 ? 0 : (0xffffffff << (32 - prefix)) >>> 0
  return [24, 16, 8, 0].map((s) => (bits >>> s) & 255).join('.')
}

export function NetworkPanel({ project }: { project: Project }) {
  const adapters = useAppStore((s) => s.adapters)
  const updateProject = useAppStore((s) => s.updateProject)
  const showToast = useAppStore((s) => s.showToast)
  const net = project.network

  const set = (patch: Partial<NetworkProfile>): void => {
    void updateProject({ id: project.id, network: { ...net, ...patch } })
  }

  const bound = adapters.find((a) => a.mac === net.adapterMac)
  const ipOk = IP_RE.test(net.ip)
  const gwOk = !net.gateway || IP_RE.test(net.gateway)
  const canApply = Boolean(bound) && ipOk && gwOk

  return (
    <div className="p-3">
      <span className="text-[11px] font-semibold uppercase tracking-wider text-muted">
        Ağ profili
      </span>

      <label className="label mt-3">Adaptör</label>
      <select
        className="input mb-1"
        value={net.adapterMac ?? ''}
        onChange={(e) => set({ adapterMac: e.target.value || null })}
      >
        <option value="">— seçilmedi —</option>
        {adapters.map((a) => (
          <option key={a.mac || a.name} value={a.mac}>
            {a.name} · {a.status}
          </option>
        ))}
        {net.adapterMac && !bound && (
          <option value={net.adapterMac}>(bağlı değil) {net.adapterMac}</option>
        )}
      </select>
      <div className="mb-3 flex items-center gap-2 text-[11px] text-muted">
        {bound ? (
          <>
            <span className={`h-1.5 w-1.5 rounded-full ${statusColor(bound.status)}`} />
            <span className="truncate">{bound.description}</span>
            <span className="ml-auto font-mono">{bound.ipv4[0] ?? '—'}</span>
          </>
        ) : net.adapterMac ? (
          <>
            <Unplug size={12} className="text-amber-400" />
            Adaptör şu an takılı değil. Takıldığında MAC ile tanınacak.
          </>
        ) : (
          <>Profili bir adaptöre bağla.</>
        )}
      </div>

      <div className="grid grid-cols-[1fr_88px] gap-2">
        <div>
          <label className="label">IP adresi</label>
          <input
            className={`input font-mono ${net.ip && !ipOk ? 'border-red-500/60' : ''}`}
            value={net.ip}
            onChange={(e) => set({ ip: e.target.value.trim() })}
          />
        </div>
        <div>
          <label className="label">Prefix</label>
          <input
            className="input font-mono"
            type="number"
            min={1}
            max={32}
            value={net.prefixLength}
            onChange={(e) =>
              set({ prefixLength: Math.min(32, Math.max(1, Number(e.target.value) || 24)) })
            }
          />
        </div>
      </div>
      <div className="mb-2 mt-1 font-mono text-[11px] text-muted">
        maske {prefixToMask(net.prefixLength)}
      </div>

      <label className="label">Ağ geçidi (opsiyonel)</label>
      <input
        className={`input mb-2 font-mono ${!gwOk ? 'border-red-500/60' : ''}`}
        value={net.gateway ?? ''}
        onChange={(e) => set({ gateway: e.target.value.trim() || undefined })}
        placeholder="192.168.1.1"
      />

      <label className="label">DNS (virgülle)</label>
      <input
        className="input mb-3 font-mono"
        value={(net.dns ?? []).join(', ')}
        onChange={(e) =>
          set({
            dns: e.target.value
              .split(',')
              .map((s) => s.trim())
              .filter(Boolean)
          })
        }
        placeholder="8.8.8.8, 1.1.1.1"
      />

      <label className="mb-3 flex items-center gap-2 text-xs text-muted">
        <input
          type="checkbox"
          checked={net.autoApply}
          onChange={(e) => set({ autoApply: e.target.checked })}
        />
        Adaptör takılınca otomatik uygula
      </label>

      <div className="flex gap-1.5">
        <button
          className="btn btn-primary flex-1 justify-center"
          disabled={!canApply}
          onClick={() => showToast('IP atama 3. aşamada geliyor (UAC ile).')}
        >
          <Zap size={12} /> Profili uygula
        </button>
        <button
          className="btn"
          disabled={!bound}
          onClick={() => showToast("DHCP'ye dönüş 3. aşamada geliyor.")}
        >
          DHCP
        </button>
      </div>
    </div>
  )
}
