import { dialog, type BrowserWindow } from 'electron'
import { promises as fs } from 'fs'
import type { Project } from '@shared/types'
import { parseImportedProject, toFileName, withoutCredentials } from './projectSerialization'

const FILTERS = [{ name: 'Termino project', extensions: ['json'] }]

/** Proje dosyasi secme diyaloglari ve disk erisimi. Donusumler ayri modulde. */
export class ProjectTransfer {
  constructor(private readonly getWindow: () => BrowserWindow | null) {}

  /** Projeyi JSON olarak yazar. Kullanici iptal ederse false doner. */
  async exportToFile(project: Project): Promise<boolean> {
    const window = this.getWindow()
    if (!window) return false

    const { canceled, filePath } = await dialog.showSaveDialog(window, {
      title: 'Export project',
      defaultPath: `${toFileName(project.name)}.termino.json`,
      filters: FILTERS
    })
    if (canceled || !filePath) return false

    const content = JSON.stringify(withoutCredentials(project), null, 2)
    await fs.writeFile(filePath, content, 'utf8')
    return true
  }

  /** Dosya secip projeyi okur; yeni id'lerle doner. Iptalde null. */
  async importFromFile(): Promise<Project | null> {
    const window = this.getWindow()
    if (!window) return null

    const { canceled, filePaths } = await dialog.showOpenDialog(window, {
      title: 'Import project',
      filters: FILTERS,
      properties: ['openFile']
    })
    const [path] = filePaths
    if (canceled || !path) return null

    return parseImportedProject(JSON.parse(await fs.readFile(path, 'utf8')))
  }
}
