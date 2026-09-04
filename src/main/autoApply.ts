import type { AdapterInfo } from '@shared/types'
import type { NetAutoEvent } from '@shared/ipc'
import type { ProjectStore } from './projectStore'
import { applyProfile } from './netApply'

/**
 * Adaptor "Up" durumuna gectiginde, o MAC'e bagli ve autoApply acik bir proje varsa
 * profili otomatik uygular. Ayni adaptor icin ayni anda tek islem yapilir.
 */
export class AutoApplier {
  private lastUp = new Set<string>()
  private busy = new Set<string>()
  private first = true

  constructor(
    private store: ProjectStore,
    private notify: (ev: NetAutoEvent) => void
  ) {}

  async onAdapters(adapters: AdapterInfo[]): Promise<void> {
    const nowUp = new Set(adapters.filter((a) => a.status === 'Up' && a.mac).map((a) => a.mac))
    const newlyUp = this.first ? [] : [...nowUp].filter((m) => !this.lastUp.has(m))
    this.first = false
    this.lastUp = nowUp
    if (newlyUp.length === 0) return

    const projects = await this.store.list()
    for (const mac of newlyUp) {
      const project = projects.find((p) => p.network.autoApply && p.network.adapterMac === mac)
      const adapter = adapters.find((a) => a.mac === mac)
      if (!project || !adapter || this.busy.has(mac)) continue
      // Zaten dogru IP'deyse dokunma.
      if (!adapter.dhcp && adapter.ipv4.includes(project.network.ip)) continue

      this.busy.add(mac)
      try {
        const result = await applyProfile(mac, project.network)
        this.notify({ projectId: project.id, projectName: project.name, adapterName: adapter.name, result })
      } catch (e) {
        this.notify({
          projectId: project.id,
          projectName: project.name,
          adapterName: adapter.name,
          result: { ok: false, message: String((e as Error).message ?? e) }
        })
      } finally {
        this.busy.delete(mac)
      }
    }
  }
}
