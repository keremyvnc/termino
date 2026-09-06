import { create } from 'zustand'

/**
 * Yalnizca gorunumle ilgili durum: hangi panel acik, palet gorunur mu.
 * Proje verisiyle ilgisi yoktur; tercihler localStorage'da saklanir.
 */
interface UiState {
  paletteOpen: boolean
  networkPanelOpen: boolean
  adaptersExpanded: boolean

  setPalette(open: boolean): void
  togglePalette(): void
  toggleNetworkPanel(): void
  setNetworkPanel(open: boolean): void
  toggleAdapters(): void
}

const KEY_NETWORK = 'termino.ui.networkPanel'
const KEY_ADAPTERS = 'termino.ui.adapters'

function readFlag(key: string, fallback: boolean): boolean {
  try {
    const raw = localStorage.getItem(key)
    return raw === null ? fallback : raw === '1'
  } catch {
    return fallback
  }
}

function writeFlag(key: string, value: boolean): void {
  try {
    localStorage.setItem(key, value ? '1' : '0')
  } catch {
    /* yok say */
  }
}

export const useUiStore = create<UiState>((set, get) => ({
  paletteOpen: false,
  networkPanelOpen: readFlag(KEY_NETWORK, true),
  adaptersExpanded: readFlag(KEY_ADAPTERS, false),

  setPalette(open) {
    set({ paletteOpen: open })
  },
  togglePalette() {
    set({ paletteOpen: !get().paletteOpen })
  },
  toggleNetworkPanel() {
    get().setNetworkPanel(!get().networkPanelOpen)
  },
  setNetworkPanel(open) {
    writeFlag(KEY_NETWORK, open)
    set({ networkPanelOpen: open })
  },
  toggleAdapters() {
    const next = !get().adaptersExpanded
    writeFlag(KEY_ADAPTERS, next)
    set({ adaptersExpanded: next })
  }
}))
