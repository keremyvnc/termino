import { useEffect, useState } from 'react'
import type { TerminalDef } from '@shared/types'

/**
 * SSH oturumlarinin kasada sifresi var mi? Sifre degeri renderer'a gelmez;
 * yalnizca "var/yok" bilgisi okunur. Sonuc oturum id'sine gore tutulur.
 */
export function useVaultFlags(defs: TerminalDef[]): Record<string, boolean> {
  const [flags, setFlags] = useState<Record<string, boolean>>({})
  const key = defs
    .filter((d) => d.kind === 'ssh')
    .map((d) => `${d.id}:${d.credentialRef ?? ''}`)
    .join('|')

  useEffect(() => {
    let cancelled = false
    const ssh = defs.filter((d) => d.kind === 'ssh')
    void Promise.all(
      ssh.map(async (d) => [d.id, await window.api.creds.has(d.credentialRef ?? `term:${d.id}`)] as const)
    ).then((pairs) => {
      if (!cancelled) setFlags(Object.fromEntries(pairs))
    })
    return () => {
      cancelled = true
    }
    // defs dizisi her render'da yeni; anlamli degisim `key` ile izlenir.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key])

  return flags
}
