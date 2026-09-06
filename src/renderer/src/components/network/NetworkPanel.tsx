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
    <div className="flex flex-col gap-4 p-3">
      <section>
        <h3 className="card-title mb-2">1 · Adapter</h3>
        <AdapterPicker
          adapters={adapters}
          selectedMac={profile.adapterMac}
          bound={bound}
          onChange={(adapterMac) => patch({ adapterMac })}
        />
      </section>

      <section>
        <h3 className="card-title mb-2">2 · Address</h3>
        <ProfileFields profile={profile} validity={validity} onChange={patch} />
      </section>

      <section>
        <h3 className="card-title mb-2">3 · Apply</h3>
        <div className="flex gap-1.5">
          <button
            className={`btn h-8 flex-1 justify-center ${applied ? 'btn-success' : 'btn-primary'}`}
            disabled={!canApply}
            onClick={() => void run('apply')}
            title={
              !bound
                ? 'Select a connected adapter first'
                : applied
                  ? 'This IP is already set on the adapter'
                  : 'Windows will ask for administrator approval'
            }
          >
            <ApplyIcon busy={busy} applied={applied} />
            {applied ? 'Applied' : 'Apply profile'}
          </button>
          <button
            className="btn h-8"
            disabled={!bound || Boolean(busy)}
            onClick={() => void run('dhcp')}
            title="Switch the adapter back to DHCP"
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

        <p className="mt-3 text-[11px] leading-relaxed text-muted/80">
          Only the IP change asks for UAC approval; the app itself does not run elevated. The
          adapter's current settings are backed up before the first apply.
        </p>
      </section>
    </div>
  )
}

function ApplyIcon({ busy, applied }: { busy: NetworkOperation | null; applied: boolean }) {
  if (busy === 'apply') return <Loader2 size={13} className="animate-spin" />
  if (applied) return <Check size={13} />
  return <Zap size={13} />
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
      title={`Backup taken ${new Date(backup.takenAt).toLocaleString()}`}
    >
      {busy ? <Loader2 size={12} className="animate-spin" /> : <RotateCcw size={12} />}
      Restore previous settings ({summary})
    </button>
  )
}

function ResultBanner({ result }: { result: OperationResult }) {
  const tone = result.ok
    ? 'border-success/30 bg-success/10 text-success'
    : 'border-danger/30 bg-danger/10 text-danger'
  return (
    <div className={`fade-in mt-2 flex items-start gap-1.5 rounded-md border px-2 py-1.5 text-[11px] ${tone}`}>
      {result.ok ? (
        <Check size={12} className="mt-0.5 shrink-0" />
      ) : (
        <ShieldAlert size={12} className="mt-0.5 shrink-0" />
      )}
      <span className="break-words">{result.text}</span>
    </div>
  )
}
