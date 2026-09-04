import { useEffect, useState } from 'react'
import { Check, Loader2, RotateCcw, ShieldAlert, Unplug, Zap } from 'lucide-react'
import type { NetworkProfile, Project } from '@shared/types'
import type { NetBackup } from '@shared/ipc'
import { useAppStore } from '../store/useAppStore'
import { statusColor } from './AdapterList'
import { prefixToMask } from '../store/useTerminalStore'

const IP_RE = /^(25[0-5]|2[0-4]\d|1?\d?\d)(\.(25[0-5]|2[0-4]\d|1?\d?\d)){3}$/

type Busy = null | 'apply' | 'dhcp' | 'restore'

export function NetworkPanel({ project }: { project: Project }) {
  const adapters = useAppStore((s) => s.adapters)
  const updateProject = useAppStore((s) => s.updateProject)
  const refreshAdapters = useAppStore((s) => s.refreshAdapters)
  const showToast = useAppStore((s) => s.showToast)
  const net = project.network
  const [busy, setBusy] = useState<Busy>(null)
  const [backup, setBackup] = useState<NetBackup | null>(null)
  const [lastMsg, setLastMsg] = useState<{ ok: boolean; text: string } | null>(null)

  const set = (patch: Partial<NetworkProfile>): void => {
    void updateProject({ id: project.id, network: { ...net, ...patch } })
  }

  const bound = adapters.find((a) => a.mac === net.adapterMac)
  const ipOk = IP_RE.test(net.ip)
  const gwOk = !net.gateway || IP_RE.test(net.gateway)
  const dnsOk = (net.dns ?? []).every((d) => IP_RE.test(d))
  const canApply = Boolean(bound) && ipOk && gwOk && dnsOk && !busy
  const applied = Boolean(bound && !bound.dhcp && bound.ipv4.includes(net.ip))

  // Adaptor veya proje degisince eski sonuc mesaji anlamsizlasir.
  useEffect(() => {
    setLastMsg(null)
  }, [net.adapterMac, project.id])

  // Yedek bilgisi: adaptor degisince ve her islem sonrasi yenilenir.
  useEffect(() => {
    if (busy) return
    if (!net.adapterMac) {
      setBackup(null)
      return
    }
    void window.api.network.backup(net.adapterMac).then(setBackup)
  }, [net.adapterMac, project.id, busy])

  const runOp = async (kind: Exclude<Busy, null>): Promise<void> => {
    if (!net.adapterMac) return
    setBusy(kind)
    setLastMsg(null)
    try {
      const r =
        kind === 'apply'
          ? await window.api.network.apply(net.adapterMac, net)
          : kind === 'dhcp'
            ? await window.api.network.dhcp(net.adapterMac)
            : await window.api.network.restore(net.adapterMac)
      setLastMsg({ ok: r.ok, text: r.message })
      showToast(r.message)
    } catch (e) {
      const text = String((e as Error).message ?? e).replace(
        /^Error invoking remote method '[^']+': Error: /,
        ''
      )
      setLastMsg({ ok: false, text })
    } finally {
      setBusy(null)
      setTimeout(() => void refreshAdapters(), 1500)
    }
  }

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
            <span className={`h-1.5 w-1.5 shrink-0 rounded-full ${statusColor(bound.status)}`} />
            <span className="truncate">{bound.description}</span>
            <span className="ml-auto shrink-0 font-mono">
              {bound.ipv4[0] ?? '—'}
              {bound.dhcp ? ' dhcp' : ''}
            </span>
          </>
        ) : net.adapterMac ? (
          <>
            <Unplug size={12} className="shrink-0 text-amber-400" />
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
        className={`input mb-3 font-mono ${!dnsOk ? 'border-red-500/60' : ''}`}
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
          className={`btn flex-1 justify-center ${applied ? '' : 'btn-primary'}`}
          disabled={!canApply}
          onClick={() => void runOp('apply')}
          title={applied ? 'Bu IP zaten adaptörde' : 'Yönetici onayı istenir'}
        >
          {busy === 'apply' ? (
            <Loader2 size={12} className="animate-spin" />
          ) : applied ? (
            <Check size={12} className="text-emerald-400" />
          ) : (
            <Zap size={12} />
          )}
          {applied ? 'Uygulandı' : 'Profili uygula'}
        </button>
        <button
          className="btn"
          disabled={!bound || Boolean(busy)}
          onClick={() => void runOp('dhcp')}
          title="Adaptörü DHCP'ye al"
        >
          {busy === 'dhcp' ? <Loader2 size={12} className="animate-spin" /> : null}
          DHCP
        </button>
      </div>

      {backup && (
        <button
          className="btn mt-1.5 w-full justify-center"
          disabled={!bound || Boolean(busy)}
          onClick={() => void runOp('restore')}
          title={`Yedek: ${new Date(backup.takenAt).toLocaleString('tr-TR')}`}
        >
          {busy === 'restore' ? (
            <Loader2 size={12} className="animate-spin" />
          ) : (
            <RotateCcw size={12} />
          )}
          Önceki ayarı geri yükle ({backup.dhcp ? 'DHCP' : `${backup.ip}/${backup.prefixLength}`})
        </button>
      )}

      {lastMsg && (
        <div
          className={`mt-2 flex items-start gap-1.5 rounded-md border px-2 py-1.5 text-[11px] ${
            lastMsg.ok
              ? 'border-emerald-500/30 bg-emerald-500/10 text-emerald-200'
              : 'border-red-500/30 bg-red-500/10 text-red-200'
          }`}
        >
          {lastMsg.ok ? (
            <Check size={12} className="mt-0.5 shrink-0" />
          ) : (
            <ShieldAlert size={12} className="mt-0.5 shrink-0" />
          )}
          <span className="break-words">{lastMsg.text}</span>
        </div>
      )}

      <p className="mt-3 text-[11px] leading-relaxed text-muted">
        Uygulama yönetici hakkıyla çalışmaz; yalnızca IP değişikliği anında Windows UAC onayı
        istenir. İlk uygulamadan önce adaptörün mevcut ayarı yedeklenir.
      </p>
    </div>
  )
}
