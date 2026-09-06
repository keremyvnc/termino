import { create } from 'zustand'

export interface ConfirmRequest {
  title: string
  message?: string
  confirmLabel?: string
  cancelLabel?: string
  danger?: boolean
}

interface ConfirmState {
  pending: (ConfirmRequest & { resolve(ok: boolean): void }) | null
  /** Soruyu gosterir; kullanici karar verince true/false ile cozulur. */
  ask(request: ConfirmRequest): Promise<boolean>
  answer(ok: boolean): void
}

/**
 * Tek bir onay diyalogu: "Silinsin mi?" gibi sorular Promise ile sorulur.
 * Zamanlanmis cift tiklama yerine her yerde ayni, gorunur diyalog kullanilir.
 */
export const useConfirmStore = create<ConfirmState>((set, get) => ({
  pending: null,

  ask(request) {
    get().pending?.resolve(false)
    return new Promise<boolean>((resolve) => {
      set({ pending: { ...request, resolve } })
    })
  },

  answer(ok) {
    const current = get().pending
    set({ pending: null })
    current?.resolve(ok)
  }
}))

export function confirmDialog(request: ConfirmRequest): Promise<boolean> {
  return useConfirmStore.getState().ask(request)
}
