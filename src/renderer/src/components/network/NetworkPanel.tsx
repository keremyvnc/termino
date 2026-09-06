import { Check, Loader2, RotateCcw, ShieldAlert, Zap } from 'lucide-react'
import type { NetworkProfile, Project } from '@shared/types'
import type { NetBackup } from '@shared/ipc'
import { useAppStore } from '../../store/useAppStore'
import { AdapterPicker } from './AdapterPicker'
import { ProfileFields } from './ProfileFields'
import { isProfileApplied, validateProfile } from './profileValidation'
import { useNetworkOperations, type NetworkOperation, type OperationResult } from './useNetworkOperations'

/**
 * Ag profili paneli. Alanlari ve islemleri alt parcalara birakir;
 * burada yalnizca bunlarin baglanmasi ve buton durumlari vardir.
 */
export function NetworkPanel({ project }: { project: Project }) {
  const adapters = useAppStore((s) => s.adapters)
  const updateProject = useAppStore((s) => s.updateProject)
  const profile = project.network
  const { busy, result, backup, run } = useNetworkOperations(project.id, profile)

  const bound = adapters.find((a) => a.mac === profile.adapterMac)
  const validity = validateProfile(profile)
  const applied = isProfileApplied(bound, profile)
  const canApply = Boolean(bound) && validity.all && !busy

  const patch = (changes: Partial<NetworkProfile>): void => {
    void updateProject({ id: project.id, network: { ...profile, ...changes } })
  }

  return (
    <div className="p-3">
      <span className="text-[11px] font-semibold uppercase tracking-wider text-muted">
        Ağ profili
      </span>

      <AdapterPicker
        adapters={adapters}
        selectedMac={profile.adapterMac}
        bound={bound}
        onChange={(adapterMac) => patch({ adapterMac })}
      />
      <ProfileFields profile={profile} validity={validity} onChange={patch} />

      <div className="flex gap-1.5">
        <button
          className={`btn flex-1 justify-center ${applied ? '' : 'btn-primary'}`}
          disabled={!canApply}
          onClick={() => void run('apply')}
          title={applied ? 'Bu IP zaten adaptörde' : 'Yönetici onayı istenir'}
        >
          <ApplyIcon busy={busy} applied={applied} />
          {applied ? 'Uygulandı' : 'Profili uygula'}
        </button>
        <button
          className="btn"
          disabled={!bound || Boolean(busy)}
          onClick={() => void run('dhcp')}
          title="Adaptörü DHCP'ye al"
        >
          {busy === 'dhcp' && <Loader2 size={12} className="animate-spin" />}
          DHCP
        </button>
      </div>

      {backup && (
        <RestoreButton
          backup={backup}
          disabled={!bound || Boolean(busy)}
          busy={busy === 'restore'}
          onClick={() => void run('restore')}
        />
      )}

      {result && <ResultBanner result={result} />}

      <p className="mt-3 text-[11px] leading-relaxed text-muted">
        Uygulama yönetici hakkıyla çalışmaz; yalnızca IP değişikliği anında Windows UAC onayı
        istenir. İlk uygulamadan önce adaptörün mevcut ayarı yedeklenir.
      </p>
    </div>
  )
}

function ApplyIcon({ busy, applied }: { busy: NetworkOperation | null; applied: boolean }) {
  if (busy === 'apply') return <Loader2 size={12} className="animate-spin" />
  if (applied) return <Check size={12} className="text-emerald-400" />
  return <Zap size={12} />
}

function RestoreButton({
  backup,
  disabled,
  busy,
  onClick
}: {
  backup: NetBackup
  disabled: boolean
  busy: boolean
  onClick: () => void
}) {
  const summary = backup.dhcp ? 'DHCP' : `${backup.ip}/${backup.prefixLength}`
  return (
    <button
      className="btn mt-1.5 w-full justify-center"
      disabled={disabled}
      onClick={onClick}
      title={`Yedek: ${new Date(backup.takenAt).toLocaleString('tr-TR')}`}
    >
      {busy ? <Loader2 size={12} className="animate-spin" /> : <RotateCcw size={12} />}
      Önceki ayarı geri yükle ({summary})
    </button>
  )
}

function ResultBanner({ result }: { result: OperationResult }) {
  const tone = result.ok
    ? 'border-emerald-500/30 bg-emerald-500/10 text-emerald-200'
    : 'border-red-500/30 bg-red-500/10 text-red-200'
  return (
    <div className={`mt-2 flex items-start gap-1.5 rounded-md border px-2 py-1.5 text-[11px] ${tone}`}>
      {result.ok ? (
        <Check size={12} className="mt-0.5 shrink-0" />
      ) : (
        <ShieldAlert size={12} className="mt-0.5 shrink-0" />
      )}
      <span className="break-words">{result.text}</span>
    </div>
  )
}
