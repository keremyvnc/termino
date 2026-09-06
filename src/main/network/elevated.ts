import { app } from 'electron'
import { promises as fs } from 'fs'
import { join } from 'path'
import type { NetApplyResult } from '@shared/ipc'
import { fileArgs, psQuote, runPowerShell, type PowerShellFailure } from './powershell'

/** PowerShell BOM'suz UTF-8 yazar; okurken olasi BOM kirpilir. */
const BOM = /^﻿/

type LaunchOutcome =
  /** Betik sorunsuz bitti (cikis 0). */
  | { status: 'completed' }
  /** Betik hata yakaladi (cikis 1); ayrinti sonuc dosyasinda. */
  | { status: 'scriptError' }
  /** Yukseltme hic baslamadi (UAC iptali vb.); mesaj dogrudan kullaniciya gider. */
  | { status: 'launchFailed'; result: NetApplyResult }

/**
 * Yonetici hakki isteyen PowerShell govdelerini calistirir.
 * Uygulamanin tamami degil, yalnizca bu islem UAC ile yukseltilir.
 */
export class ElevatedRunner {
  private get directory(): string {
    return join(app.getPath('temp'), 'termino')
  }

  async run(body: string): Promise<NetApplyResult> {
    const dir = this.directory
    await fs.mkdir(dir, { recursive: true })
    const stamp = Date.now().toString(36)
    const scriptPath = join(dir, `net-${stamp}.ps1`)
    const resultPath = join(dir, `net-${stamp}.json`)

    await fs.writeFile(scriptPath, '﻿' + wrapWithResultFile(body, resultPath), 'utf8')

    const outcome = await this.launch(scriptPath)
    if (outcome.status === 'launchFailed') {
      await fs.rm(scriptPath, { force: true })
      return outcome.result
    }

    const result = await readResult(resultPath, defaultFor(outcome.status))
    await Promise.all([fs.rm(scriptPath, { force: true }), fs.rm(resultPath, { force: true })])
    return result
  }

  /** Yukseltmeyi disaridan bir PowerShell ile tetikler; UAC iptalinde hata firlar. */
  private async launch(scriptPath: string): Promise<LaunchOutcome> {
    const argumentList = fileArgs(scriptPath)
      .map((arg) => `'${psQuote(arg)}'`)
      .join(',')
    const launcher = [
      `$p = Start-Process -FilePath 'powershell.exe' -Verb RunAs -WindowStyle Hidden -Wait -PassThru -ArgumentList @(${argumentList})`,
      'exit $p.ExitCode'
    ].join('\n')

    try {
      await runPowerShell(launcher)
      return { status: 'completed' }
    } catch (e) {
      const failure = e as PowerShellFailure
      if (failure.code === 1) return { status: 'scriptError' }
      const text = String(failure.stderr || failure.message || '')
      const cancelled = /canceled|iptal|1223/i.test(text)
      return {
        status: 'launchFailed',
        result: { ok: false, message: cancelled ? 'Administrator approval was cancelled.' : text.trim() }
      }
    }
  }
}

/** Sonuc dosyasi okunamazsa cikis koduna guvenilir. */
function defaultFor(status: 'completed' | 'scriptError'): NetApplyResult {
  return status === 'completed'
    ? { ok: true, message: '' }
    : { ok: false, message: 'The elevated script failed; details could not be retrieved.' }
}

/** Govdeyi try/catch ile sarar ve sonucunu BOM'suz UTF-8 JSON olarak yazdirir. */
function wrapWithResultFile(body: string, resultPath: string): string {
  const encoding = '(New-Object Text.UTF8Encoding $false)'
  return [
    "$ErrorActionPreference = 'Stop'",
    `$resultPath = '${psQuote(resultPath)}'`,
    'try {',
    body,
    `  [IO.File]::WriteAllText($resultPath, ([pscustomobject]@{ ok=$true; message='' } | ConvertTo-Json -Compress), ${encoding})`,
    '  exit 0',
    '} catch {',
    `  [IO.File]::WriteAllText($resultPath, ([pscustomobject]@{ ok=$false; message=$_.Exception.Message } | ConvertTo-Json -Compress), ${encoding})`,
    '  exit 1',
    '}'
  ].join('\n')
}

async function readResult(resultPath: string, fallback: NetApplyResult): Promise<NetApplyResult> {
  try {
    return JSON.parse((await fs.readFile(resultPath, 'utf8')).replace(BOM, ''))
  } catch {
    return fallback
  }
}
