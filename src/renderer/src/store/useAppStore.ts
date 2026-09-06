import { create } from 'zustand'
import type { AdapterInfo, Project } from '@shared/types'
import { newProject } from '@shared/types'

interface AppState {
  projects: Project[]
  selectedId: string | null
  adapters: AdapterInfo[]
  loading: boolean
  toast: { message: string; tone: ToastTone } | null
  /** Yeni proje adini soran diyalog acik mi. */
  newProjectOpen: boolean

  load(): Promise<void>
  /** Diskteki YAML'lar disaridan degisince gelen guncel liste. Secim korunur. */
  setProjects(projects: Project[]): void
  select(id: string | null): void
  openNewProject(): void
  closeNewProject(): void
  createProject(name?: string): Promise<void>
  importProject(): Promise<void>
  updateProject(patch: Partial<Project> & { id: string }): Promise<void>
  removeProject(id: string): Promise<void>
  setAdapters(adapters: AdapterInfo[]): void
  refreshAdapters(): Promise<void>
  showToast(message: string, tone?: ToastTone): void
}

export type ToastTone = 'info' | 'success' | 'error'

let toastTimer: ReturnType<typeof setTimeout> | null = null

export const useAppStore = create<AppState>((set, get) => ({
  projects: [],
  selectedId: null,
  adapters: [],
  loading: true,
  toast: null,
  newProjectOpen: false,

  async load() {
    // Projeler hemen gosterilir; adaptor listesi (PowerShell) daha yavas gelir ve arkadan dolar.
    const projects = await window.api.projects.list()
    const stored = localStorage.getItem('termino.selected')
    const selectedId =
      projects.find((p) => p.id === stored)?.id ?? projects[0]?.id ?? null
    set({ projects, loading: false, selectedId })
    const adapters = await window.api.network.listAdapters().catch(() => [])
    set({ adapters })
  },

  setProjects(projects) {
    set((s) => ({
      projects,
      selectedId: projects.some((p) => p.id === s.selectedId)
        ? s.selectedId
        : (projects[0]?.id ?? null)
    }))
  },

  select(id) {
    if (id) localStorage.setItem('termino.selected', id)
    set({ selectedId: id })
  },

  openNewProject() {
    set({ newProjectOpen: true })
  },

  closeNewProject() {
    set({ newProjectOpen: false })
  },

  async createProject(name) {
    const trimmed = name?.trim()
    const p = await window.api.projects.save(newProject(trimmed ? { name: trimmed } : {}))
    set((s) => ({ projects: [...s.projects, p], selectedId: p.id, newProjectOpen: false }))
    localStorage.setItem('termino.selected', p.id)
  },

  async importProject() {
    try {
      const p = await window.api.app.importProject()
      if (!p) return
      const saved = await window.api.projects.save(p)
      set((s) => ({ projects: [...s.projects, saved], selectedId: saved.id }))
      localStorage.setItem('termino.selected', saved.id)
      get().showToast(`"${saved.name}" imported. Set the adapter and passwords again.`, 'success')
    } catch (e) {
      get().showToast('Import failed: ' + String((e as Error).message ?? e), 'error')
    }
  },

  async updateProject(patch) {
    const current = get().projects.find((p) => p.id === patch.id)
    if (!current) return
    const merged = { ...current, ...patch }
    // Onceden guncelle, sonra diske yaz (hizli his icin).
    set((s) => ({ projects: s.projects.map((p) => (p.id === merged.id ? merged : p)) }))
    const saved = await window.api.projects.save(merged)
    set((s) => ({ projects: s.projects.map((p) => (p.id === saved.id ? saved : p)) }))
  },

  async removeProject(id) {
    await window.api.projects.remove(id)
    set((s) => {
      const projects = s.projects.filter((p) => p.id !== id)
      const selectedId = s.selectedId === id ? (projects[0]?.id ?? null) : s.selectedId
      return { projects, selectedId }
    })
  },

  setAdapters(adapters) {
    set({ adapters })
  },

  async refreshAdapters() {
    try {
      set({ adapters: await window.api.network.listAdapters() })
    } catch (e) {
      get().showToast('Could not read adapters: ' + String(e), 'error')
    }
  },

  showToast(message, tone = 'info') {
    if (toastTimer) clearTimeout(toastTimer)
    set({ toast: { message, tone } })
    // Hata mesajlari okunabilsin diye biraz daha uzun kalir.
    toastTimer = setTimeout(() => set({ toast: null }), tone === 'error' ? 6000 : 3500)
  }
}))

export function useSelectedProject(): Project | null {
  return useAppStore((s) => s.projects.find((p) => p.id === s.selectedId) ?? null)
}
