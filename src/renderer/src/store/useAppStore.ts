import { create } from 'zustand'
import type { AdapterInfo, Project } from '@shared/types'
import { newProject } from '@shared/types'

interface AppState {
  projects: Project[]
  selectedId: string | null
  adapters: AdapterInfo[]
  loading: boolean
  toast: string | null

  load(): Promise<void>
  select(id: string | null): void
  createProject(): Promise<void>
  updateProject(patch: Partial<Project> & { id: string }): Promise<void>
  removeProject(id: string): Promise<void>
  setAdapters(adapters: AdapterInfo[]): void
  refreshAdapters(): Promise<void>
  showToast(message: string): void
}

let toastTimer: ReturnType<typeof setTimeout> | null = null

export const useAppStore = create<AppState>((set, get) => ({
  projects: [],
  selectedId: null,
  adapters: [],
  loading: true,
  toast: null,

  async load() {
    const [projects, adapters] = await Promise.all([
      window.api.projects.list(),
      window.api.network.listAdapters().catch(() => [])
    ])
    const stored = localStorage.getItem('termino.selected')
    const selectedId =
      projects.find((p) => p.id === stored)?.id ?? projects[0]?.id ?? null
    set({ projects, adapters, loading: false, selectedId })
  },

  select(id) {
    if (id) localStorage.setItem('termino.selected', id)
    set({ selectedId: id })
  },

  async createProject() {
    const p = await window.api.projects.save(newProject())
    set((s) => ({ projects: [...s.projects, p], selectedId: p.id }))
    localStorage.setItem('termino.selected', p.id)
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
      get().showToast('Adaptörler okunamadı: ' + String(e))
    }
  },

  showToast(message) {
    if (toastTimer) clearTimeout(toastTimer)
    set({ toast: message })
    toastTimer = setTimeout(() => set({ toast: null }), 3000)
  }
}))

export function useSelectedProject(): Project | null {
  return useAppStore((s) => s.projects.find((p) => p.id === s.selectedId) ?? null)
}
