import type { AdapterInfo, Project } from '@shared/types'
import type { NetAutoEvent } from '@shared/ipc'
import type { ProjectStore } from './project/projectStore'
import type { NetworkApplier } from './network'

/**
 * Adaptor "Up" durumuna gectiginde, o MAC'e bagli ve autoApply acik bir proje varsa
 * profili otomatik uygular. Ayni adaptor icin ayni anda tek islem yapilir.
 *
 * Uygulamayi kendisi yapmaz; NetworkApplier'a devreder (DIP).
 */
export class AutoApplier {
  /** Bir onceki taramada bagli olan MAC'ler. */
  private previouslyUp = new Set<string>()
  private inProgress = new Set<string>()
  /** Ilk tarama mevcut durumu bildirir; onu "yeni takildi" saymayiz. */
  private firstScan = true

  constructor(
    private readonly store: ProjectStore,
    private readonly network: NetworkApplier,
    private readonly notify: (event: NetAutoEvent) => void
  ) {}

  async onAdapters(adapters: AdapterInfo[]): Promise<void> {
    const newlyUp = this.findNewlyUp(adapters)
    if (newlyUp.length === 0) return

    const projects = await this.store.list()
    for (const mac of newlyUp) {
      const adapter = adapters.find((a) => a.mac === mac)
      const project = projects.find((p) => p.network.autoApply && p.network.adapterMac === mac)
      if (adapter && project && this.shouldApply(adapter, project)) {
        await this.apply(adapter, project)
      }
    }
  }

  private findNewlyUp(adapters: AdapterInfo[]): string[] {
    const nowUp = new Set(adapters.filter((a) => a.status === 'Up' && a.mac).map((a) => a.mac))
    const newlyUp = this.firstScan ? [] : [...nowUp].filter((mac) => !this.previouslyUp.has(mac))
    this.firstScan = false
    this.previouslyUp = nowUp
    return newlyUp
  }

  /** Zaten dogru IP'deyse veya islem surerken tekrar tetiklenirse dokunma. */
  private shouldApply(adapter: AdapterInfo, project: Project): boolean {
    if (this.inProgress.has(adapter.mac)) return false
    return adapter.dhcp || !adapter.ipv4.includes(project.network.ip)
  }

  private async apply(adapter: AdapterInfo, project: Project): Promise<void> {
    this.inProgress.add(adapter.mac)
    try {
      const result = await this.network.applyProfile(adapter.mac, project.network)
      this.report(adapter, project, result)
    } catch (e) {
      this.report(adapter, project, { ok: false, message: String((e as Error).message ?? e) })
    } finally {
      this.inProgress.delete(adapter.mac)
    }
  }

  private report(adapter: AdapterInfo, project: Project, result: NetAutoEvent['result']): void {
    this.notify({
      projectId: project.id,
      projectName: project.name,
      adapterName: adapter.name,
      result
    })
  }
}
