import { app } from 'electron'
import { promises as fs } from 'fs'
import { join } from 'path'
import type { Project } from '@shared/types'

/** Projeler tek tek JSON dosyasi olarak %APPDATA%/termino/projects altinda tutulur. */
export class ProjectStore {
  private dir = join(app.getPath('userData'), 'projects')

  get directory(): string {
    return this.dir
  }

  private async ensure(): Promise<void> {
    await fs.mkdir(this.dir, { recursive: true })
  }

  private file(id: string): string {
    if (!/^[a-zA-Z0-9-_]+$/.test(id)) throw new Error('Gecersiz proje id')
    return join(this.dir, `${id}.json`)
  }

  async list(): Promise<Project[]> {
    await this.ensure()
    const names = (await fs.readdir(this.dir)).filter((n) => n.endsWith('.json'))
    const projects: Project[] = []
    for (const n of names) {
      try {
        projects.push(JSON.parse(await fs.readFile(join(this.dir, n), 'utf8')))
      } catch (e) {
        console.warn(`Proje okunamadi: ${n}`, e)
      }
    }
    return projects.sort((a, b) => a.name.localeCompare(b.name, 'tr'))
  }

  async save(project: Project): Promise<Project> {
    await this.ensure()
    const updated = { ...project, updatedAt: new Date().toISOString() }
    const target = this.file(project.id)
    const tmp = `${target}.tmp`
    await fs.writeFile(tmp, JSON.stringify(updated, null, 2), 'utf8')
    await fs.rename(tmp, target)
    return updated
  }

  async remove(id: string): Promise<void> {
    await fs.rm(this.file(id), { force: true })
  }
}
