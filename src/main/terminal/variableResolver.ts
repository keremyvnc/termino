import type { SecretReader } from '../credentials'

export type VariableResolver = (text: string) => Promise<string>

const PLAIN_VARIABLE = /\{\{\s*([a-zA-Z_]+)\s*\}\}/g
const SECRET_VARIABLE = /\{\{\s*secret:([^}\s]+)\s*\}\}/g

/**
 * Senaryo metnindeki yer tutuculari doldurur:
 *  - `{{ip}}` gibi degiskenler proje profilinden gelir,
 *  - `{{secret:ad}}` once `term:<oturumId>:<ad>`, sonra ham ad olarak kasada aranir.
 *
 * Sifreler yalnizca burada, yani main surecinde cozulur.
 */
export function createVariableResolver(
  secrets: SecretReader,
  values: Record<string, string>,
  sessionDefId?: string
): VariableResolver {
  return async (text) => {
    let out = text.replace(PLAIN_VARIABLE, (match, key: string) => values[key] ?? match)
    for (const match of [...out.matchAll(SECRET_VARIABLE)]) {
      out = out.replace(match[0], await readSecret(secrets, match[1], sessionDefId))
    }
    return out
  }
}

async function readSecret(
  secrets: SecretReader,
  name: string,
  sessionDefId?: string
): Promise<string> {
  const scoped = sessionDefId ? await secrets.get(`term:${sessionDefId}:${name}`) : null
  const value = scoped ?? (await secrets.get(name))
  if (value === null) throw new Error(`kasada "${name}" adlı şifre yok`)
  return value
}
