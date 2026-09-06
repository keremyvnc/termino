import { execFile } from 'child_process'
import { promisify } from 'util'

const execFileAsync = promisify(execFile)

/** Her cagrida tekrarlanan PowerShell bayraklari. */
const BASE_ARGS = ['-NoProfile', '-NonInteractive', '-ExecutionPolicy', 'Bypass']

/** execFile'in firlattigi hatanin ilgilendigimiz alanlari. */
export interface PowerShellFailure {
  code?: number | string
  stderr?: string
  message?: string
}

/**
 * PowerShell betigini normal kullanici hakkiyla calistirir ve stdout'u dondurur.
 * Yonetici gerektiren isler icin `runElevated` kullanilir.
 */
export async function runPowerShell(script: string, maxBuffer?: number): Promise<string> {
  const { stdout } = await execFileAsync('powershell.exe', [...BASE_ARGS, '-Command', script], {
    windowsHide: true,
    ...(maxBuffer === undefined ? {} : { maxBuffer })
  })
  return stdout
}

/** PowerShell tek tirnakli metin icine guvenli gomme. */
export function psQuote(value: string): string {
  return value.replace(/'/g, "''")
}

/** Betigi dosyadan calistiracak argumanlari uretir. */
export function fileArgs(scriptPath: string): string[] {
  return [...BASE_ARGS, '-File', scriptPath]
}
