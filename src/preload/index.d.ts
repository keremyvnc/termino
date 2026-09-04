import type { TerminoApi } from '@shared/ipc'

declare global {
  interface Window {
    api: TerminoApi
  }
}
export {}
