import type { WebContents } from 'electron'
import { IPC, type TermExitInfo } from '@shared/ipc'
import type { TerminalEventSink } from '../terminal'

/** Terminal olaylarini renderer'a IPC ile tasir. Kanal adlarini yalnizca bu sinif bilir. */
export class WebContentsTerminalSink implements TerminalEventSink {
  constructor(private readonly getWebContents: () => WebContents | null) {}

  data(id: string, data: string): void {
    this.send(IPC.termData, { id, data })
  }

  exit(info: TermExitInfo): void {
    this.send(IPC.termExit, info)
  }

  private send(channel: string, payload: unknown): void {
    const contents = this.getWebContents()
    if (contents && !contents.isDestroyed()) contents.send(channel, payload)
  }
}
