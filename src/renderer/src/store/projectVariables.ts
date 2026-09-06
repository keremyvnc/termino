import type { Project } from '@shared/types'
import { prefixToMask } from '@shared/net'

const PLACEHOLDER = /\{\{\s*([a-zA-Z_]+)\s*\}\}/g

/** Senaryo ve komutlarda kullanilabilen proje degiskenleri. */
export function projectVars(project: Project): Record<string, string> {
  const net = project.network
  return {
    ip: net.ip,
    prefix: String(net.prefixLength),
    mask: prefixToMask(net.prefixLength),
    gateway: net.gateway ?? '',
    dns: (net.dns ?? []).join(','),
    project: project.name
  }
}

/**
 * Metindeki {{degisken}} alanlarini proje profilinden doldurur.
 * Yalnizca onizleme icindir; gercek doldurma main surecinde yapilir
 * (sifreler renderer'a hic gelmez).
 */
export function expandVariables(text: string, project: Project): string {
  const vars = projectVars(project)
  return text.replace(PLACEHOLDER, (match, key: string) => vars[key] ?? match)
}
