import { app, safeStorage } from 'electron'
import { promises as fs } from 'fs'
import { join } from 'path'

/**
 * Sifre kasasi. Her sifre Windows DPAPI (safeStorage) ile sifrelenir ve
 * %APPDATA%/termino/vault.json icinde base64 olarak tutulur.
 * Sifreler yalnizca main surecinde cozulur; renderer'a asla gonderilmez.
 */
export class CredentialVault {
  private file = join(app.getPath('userData'), 'vault.json')
  private cache: Record<string, string> | null = null

  private async load(): Promise<Record<string, string>> {
    if (this.cache) return this.cache
    try {
      this.cache = JSON.parse(await fs.readFile(this.file, 'utf8'))
    } catch {
      this.cache = {}
    }
    return this.cache!
  }

  private async persist(): Promise<void> {
    const tmp = `${this.file}.tmp`
    await fs.writeFile(tmp, JSON.stringify(this.cache ?? {}, null, 2), 'utf8')
    await fs.rename(tmp, this.file)
  }

  available(): boolean {
    return safeStorage.isEncryptionAvailable()
  }

  async set(ref: string, secret: string): Promise<void> {
    if (!this.available()) throw new Error('Bu sistemde şifreleme kullanılamıyor.')
    const store = await this.load()
    store[ref] = safeStorage.encryptString(secret).toString('base64')
    await this.persist()
  }

  async get(ref: string): Promise<string | null> {
    const store = await this.load()
    const enc = store[ref]
    if (!enc) return null
    try {
      return safeStorage.decryptString(Buffer.from(enc, 'base64'))
    } catch {
      return null
    }
  }

  async has(ref: string): Promise<boolean> {
    return Boolean((await this.load())[ref])
  }

  async removePrefix(prefix: string): Promise<void> {
    const store = await this.load()
    let changed = false
    for (const k of Object.keys(store)) {
      if (k === prefix || k.startsWith(prefix + ':')) {
        delete store[k]
        changed = true
      }
    }
    if (changed) await this.persist()
  }

  async remove(ref: string): Promise<void> {
    const store = await this.load()
    if (ref in store) {
      delete store[ref]
      await this.persist()
    }
  }
}
