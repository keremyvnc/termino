import { useEffect, useState } from 'react'
import type { Project, TerminalDef } from '@shared/types'
import { useAppStore } from '../../store/useAppStore'

/** Ek sifre adlari dosya adi gibi sade tutulur. */
function normalizeName(name: string): string {
  return name.trim().replace(/[^\w-]/g, '_')
}

/**
 * Oturumun kasa islemleri. Sifreler YAML'a yazilmaz; kasaya (DPAPI) gider ve
 * dosyada yalnizca `credentialRef` / `secrets` adlari gorunur.
 */
export function useSessionSecrets(project: Project, def: TerminalDef) {
  const updateProject = useAppStore((s) => s.updateProject)
  const showToast = useAppStore((s) => s.showToast)
  const credentialRef = def.credentialRef ?? `term:${def.id}`
  const [hasPassword, setHasPassword] = useState(false)

  useEffect(() => {
    void window.api.creds.has(credentialRef).then(setHasPassword)
  }, [credentialRef])

  const patch = (changes: Partial<TerminalDef>): Promise<void> =>
    updateProject({
      id: project.id,
      terminals: project.terminals.map((t) => (t.id === def.id ? { ...t, ...changes } : t))
    })

  const secretKey = (name: string): string => `term:${def.id}:${name}`

  /** Basarili olursa true doner; cagiran alani temizler. */
  const savePassword = async (password: string): Promise<boolean> => {
    if (!password) return false
    try {
      await window.api.creds.set(credentialRef, password)
      if (def.credentialRef !== credentialRef) await patch({ credentialRef })
      setHasPassword(true)
      showToast('Şifre kasaya kaydedildi.')
      return true
    } catch (e) {
      showToast('Kaydedilemedi: ' + String((e as Error).message ?? e))
      return false
    }
  }

  const addSecret = async (rawName: string, value: string): Promise<boolean> => {
    const name = normalizeName(rawName)
    if (!name || !value) return false
    try {
      await window.api.creds.set(secretKey(name), value)
      await patch({ secrets: [...new Set([...(def.secrets ?? []), name])] })
      return true
    } catch (e) {
      showToast('Kaydedilemedi: ' + String((e as Error).message ?? e))
      return false
    }
  }

  const removeSecret = async (name: string): Promise<void> => {
    await window.api.creds.remove(secretKey(name))
    await patch({ secrets: (def.secrets ?? []).filter((s) => s !== name) })
  }

  return { hasPassword, savePassword, addSecret, removeSecret }
}
