import { useEffect, useState } from 'react'
import type { NetBackup } from '@shared/ipc'
import type { NetworkProfile } from '@shared/types'
import { useAppStore } from '../../store/useAppStore'
import { toReadableError } from './profileValidation'

export type NetworkOperation = 'apply' | 'dhcp' | 'restore'

export interface OperationResult {
  ok: boolean
  text: string
}

/** Islem bittikten sonra adaptorlerin yeni durumu bu gecikmeyle okunur. */
const REFRESH_DELAY_MS = 1500

/**
 * Ag islemlerinin (uygula / DHCP / geri yukle) durumunu yonetir:
 * hangi islem suruyor, son sonuc ne, mevcut yedek var mi.
 * Bilesen yalnizca gorunumden sorumlu kalir.
 */
export function useNetworkOperations(projectId: string, profile: NetworkProfile) {
  const refreshAdapters = useAppStore((s) => s.refreshAdapters)
  const showToast = useAppStore((s) => s.showToast)
  const [busy, setBusy] = useState<NetworkOperation | null>(null)
  const [result, setResult] = useState<OperationResult | null>(null)
  const [backup, setBackup] = useState<NetBackup | null>(null)
  const mac = profile.adapterMac

  // Adaptor veya proje degisince eski sonuc mesaji anlamsizlasir.
  useEffect(() => {
    setResult(null)
  }, [mac, projectId])

  // Yedek bilgisi: adaptor degisince ve her islem sonrasi yenilenir.
  useEffect(() => {
    if (busy) return
    if (!mac) {
      setBackup(null)
      return
    }
    void window.api.network.backup(mac).then(setBackup)
  }, [mac, projectId, busy])

  const run = async (operation: NetworkOperation): Promise<void> => {
    if (!mac) return
    setBusy(operation)
    setResult(null)
    try {
      const outcome = await invoke(operation, mac, profile)
      setResult({ ok: outcome.ok, text: outcome.message })
      showToast(outcome.message)
    } catch (e) {
      setResult({ ok: false, text: toReadableError(e) })
    } finally {
      setBusy(null)
      setTimeout(() => void refreshAdapters(), REFRESH_DELAY_MS)
    }
  }

  return { busy, result, backup, run }
}

function invoke(
  operation: NetworkOperation,
  mac: string,
  profile: NetworkProfile
): Promise<{ ok: boolean; message: string }> {
  switch (operation) {
    case 'apply':
      return window.api.network.apply(mac, profile)
    case 'dhcp':
      return window.api.network.dhcp(mac)
    case 'restore':
      return window.api.network.restore(mac)
  }
}
