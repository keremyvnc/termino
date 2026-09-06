import { app } from 'electron'
import { promises as fs, watch, type FSWatcher } from 'fs'
import { join } from 'path'
import type { CommandDef, Project, TerminalDef } from '@shared/types'
import { newId } from '@shared/types'
import {
  commandFromYaml,
  commandToYaml,
  projectMetaFromYaml,
  projectMetaToYaml,
  sessionFromYaml,
  sessionToYaml,
  uniqueSlugs
} from '@shared/projectYaml'

const SAFE_ID = /^[a-zA-Z0-9-_]+$/
const YAML = /\.ya?ml$/i
/** Kendi yazmamizdan sonra gelen dosya olaylarini bu sure yok say. */
const SELF_WRITE_GRACE_MS = 800
const WATCH_DEBOUNCE_MS = 400

/**
 * Projeler %APPDATA%/termino/projects/<id>/ altinda YAML dosyalari olarak tutulur:
 *   project.yaml, sessions/<ad>.yaml, commands/<ad>.yaml
 * Eski tek dosyali <id>.json projeler ilk okumada bu yapiya tasinir.
 * Dizin izlenir; disaridan yapilan degisiklikler `onChange` ile bildirilir.
 */
export class ProjectStore {
  private readonly dir = join(app.getPath('userData'), 'projects')
  private watcher: FSWatcher | null = null
  private lastWriteAt = 0
  private debounce: ReturnType<typeof setTimeout> | null = null

  get directory(): string {
    return this.dir
  }

  async list(): Promise<Project[]> {
    await this.ensureDirectory()
    await this.migrateLegacy()
    const entries = await fs.readdir(this.dir, { withFileTypes: true })
    const projects: Project[] = []
    for (const entry of entries) {
      if (!entry.isDirectory() || !SAFE_ID.test(entry.name)) continue
      const project = await this.readProject(entry.name)
      if (project) projects.push(project)
    }
    return projects.sort((a, b) => a.name.localeCompare(b.name, 'en'))
  }

  async save(project: Project): Promise<Project> {
    await this.ensureDirectory()
    const updated = { ...project, updatedAt: new Date().toISOString() }
    const root = this.dirFor(project.id)
    await fs.mkdir(join(root, 'sessions'), { recursive: true })
    await fs.mkdir(join(root, 'commands'), { recursive: true })

    this.markWrite()
    await this.writeAtomic(join(root, 'project.yaml'), projectMetaToYaml(updated))
    await this.syncFolder(join(root, 'sessions'), updated.terminals, sessionToYaml)
    await this.syncFolder(join(root, 'commands'), updated.commands, commandToYaml)
    this.markWrite()
    return updated
  }

  async remove(id: string): Promise<void> {
    this.markWrite()
    await fs.rm(this.dirFor(id), { recursive: true, force: true })
  }

  /** Dizini izler; disaridan degisiklik olunca guncel listeyi verir. */
  watch(onChange: (projects: Project[]) => void): void {
    if (this.watcher) return
    void this.ensureDirectory().then(() => {
      try {
        this.watcher = watch(this.dir, { recursive: true }, () => {
          if (Date.now() - this.lastWriteAt < SELF_WRITE_GRACE_MS) return
          if (this.debounce) clearTimeout(this.debounce)
          this.debounce = setTimeout(() => {
            void this.list().then(onChange).catch(() => undefined)
          }, WATCH_DEBOUNCE_MS)
        })
      } catch (e) {
        console.warn('Cannot watch project directory', e)
      }
    })
  }

  unwatch(): void {
    this.watcher?.close()
    this.watcher = null
  }

  // ---------- okuma ----------

  private async readProject(id: string): Promise<Project | null> {
    const root = this.dirFor(id)
    try {
      const meta = projectMetaFromYaml(await fs.readFile(join(root, 'project.yaml'), 'utf8'), id)
      const terminals = await this.readFolder(join(root, 'sessions'), (text, base) =>
        sessionFromYaml(text, base)
      )
      const commands = await this.readFolder(join(root, 'commands'), (text, base) =>
        commandFromYaml(text, base)
      )
      return { ...meta, terminals, commands }
    } catch (e) {
      console.warn(`Could not read project: ${id}`, e)
      return null
    }
  }

  /** Bozuk bir dosya tum projeyi dusurmesin; atlanip uyari yazilir. */
  private async readFolder<T>(
    folder: string,
    parse: (text: string, base: { id: string }) => T
  ): Promise<T[]> {
    let names: string[]
    try {
      names = (await fs.readdir(folder)).filter((n) => YAML.test(n)).sort()
    } catch {
      return []
    }
    const items: T[] = []
    for (const name of names) {
      try {
        // Dosyada id yoksa dosya adindan turetilen sabit bir id kullanilir.
        const text = await fs.readFile(join(folder, name), 'utf8')
        items.push(parse(text, { id: `f-${name.replace(YAML, '')}` }))
      } catch (e) {
        console.warn(`Could not read file: ${join(folder, name)}`, e)
      }
    }
    return items
  }

  // ---------- yazma ----------

  /** Klasoru tanim listesiyle esler: istenenler yazilir, fazlasi silinir. */
  private async syncFolder<T extends { name: string }>(
    folder: string,
    items: T[],
    toYaml: (item: T) => string
  ): Promise<void> {
    const slugs = uniqueSlugs(items.map((i) => i.name))
    const wanted = new Set(slugs.map((s) => `${s}.yaml`))
    for (const [i, item] of items.entries()) {
      const file = join(folder, `${slugs[i]}.yaml`)
      const content = toYaml(item)
      if ((await this.readIfExists(file)) !== content) await this.writeAtomic(file, content)
    }
    for (const name of await fs.readdir(folder)) {
      if (YAML.test(name) && !wanted.has(name)) await fs.rm(join(folder, name), { force: true })
    }
  }

  private async readIfExists(file: string): Promise<string | null> {
    try {
      return await fs.readFile(file, 'utf8')
    } catch {
      return null
    }
  }

  /** Once .tmp dosyasina yazip yeniden adlandirir: yarim dosya kalmaz. */
  private async writeAtomic(target: string, content: string): Promise<void> {
    const temp = `${target}.tmp`
    await fs.writeFile(temp, content, 'utf8')
    await fs.rename(temp, target)
  }

  private markWrite(): void {
    this.lastWriteAt = Date.now()
  }

  // ---------- eski bicim ----------

  /** <id>.json dosyalarini dizin yapisina cevirir ve siler. */
  private async migrateLegacy(): Promise<void> {
    const names = (await fs.readdir(this.dir)).filter((n) => n.endsWith('.json'))
    for (const name of names) {
      const file = join(this.dir, name)
      try {
        const raw = JSON.parse(await fs.readFile(file, 'utf8')) as Record<string, unknown>
        const project = legacyToProject(raw, name.replace(/\.json$/, ''))
        await this.save(project)
        await fs.rm(file, { force: true })
        console.info(`Project migrated to YAML layout: ${project.name}`)
      } catch (e) {
        console.warn(`Could not migrate legacy project: ${name}`, e)
      }
    }
  }

  private dirFor(id: string): string {
    if (!SAFE_ID.test(id)) throw new Error('Invalid project id')
    return join(this.dir, id)
  }

  private async ensureDirectory(): Promise<void> {
    await fs.mkdir(this.dir, { recursive: true })
  }
}

/** Eski JSON projesi: komutlar tek metindi (`text`), simdi adim listesi. */
function legacyToProject(raw: Record<string, unknown>, id: string): Project {
  const commands = (Array.isArray(raw.commands) ? raw.commands : []).map(
    (c: Record<string, unknown>): CommandDef => ({
      id: String(c.id ?? newId()),
      name: String(c.name ?? 'command'),
      shell: (c.shell as CommandDef['shell']) ?? 'powershell',
      runInNewTab: Boolean(c.runInNewTab),
      steps: Array.isArray(c.steps)
        ? (c.steps as CommandDef['steps'])
        : String(c.text ?? '')
            .split(/\r?\n/)
            .filter((l) => l.trim())
            .map((l) => ({ type: 'send', text: l }))
    })
  )
  const terminals = (Array.isArray(raw.terminals) ? raw.terminals : []) as TerminalDef[]
  const meta = projectMetaFromYaml(projectMetaToYaml({ ...(raw as unknown as Project), id }), id)
  return { ...meta, commands, terminals }
}
