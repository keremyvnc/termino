import { useEffect, useRef } from 'react'
import { EditorView, basicSetup } from 'codemirror'
import { EditorState } from '@codemirror/state'
import { keymap } from '@codemirror/view'
import { indentWithTab } from '@codemirror/commands'
import { yaml } from '@codemirror/lang-yaml'
import { oneDark } from '@codemirror/theme-one-dark'

const THEME = EditorView.theme({
  '&': { height: '100%', fontSize: '13px', backgroundColor: '#0b0f14' },
  '.cm-scroller': { fontFamily: '"Cascadia Code", "JetBrains Mono", Consolas, monospace' },
  '.cm-gutters': { backgroundColor: '#0b0f14', borderRight: '1px solid #1f2a37' },
  '.cm-activeLineGutter, .cm-activeLine': { backgroundColor: '#11182199' }
})

interface Options {
  /** Sekme basina bir editor; bu deger degisince editor yeniden kurulur. */
  tabId: string
  /** Diskteki (tanimdan uretilen) metin. */
  diskText: string
  dirty: boolean
  visible: boolean
  onDirtyChange(dirty: boolean): void
  onSave(text: string): void
}

/**
 * CodeMirror'un yasam dongusunu yonetir: kurulum, Ctrl+S, kirlilik takibi ve
 * disaridan gelen degisikliklerin (kayit sonrasi, dosya izleyici) yansitilmasi.
 * Bilesen bu ayrintilarla ugrasmaz.
 */
export function useYamlEditor({
  tabId,
  diskText,
  dirty,
  visible,
  onDirtyChange,
  onSave
}: Options): { hostRef: React.RefObject<HTMLDivElement | null>; save: () => void } {
  const hostRef = useRef<HTMLDivElement>(null)
  const viewRef = useRef<EditorView | null>(null)
  const diskTextRef = useRef(diskText)

  // Her render'da guncellenir; editor bir kez kuruldugu icin geri cagirmalar
  // ref uzerinden en son degerleri gorur.
  const saveRef = useRef<() => void>(() => undefined)
  saveRef.current = () => onSave(viewRef.current?.state.doc.toString() ?? '')
  const dirtyRef = useRef(onDirtyChange)
  dirtyRef.current = onDirtyChange

  useEffect(() => {
    const host = hostRef.current
    if (!host) return
    const view = new EditorView({
      parent: host,
      state: EditorState.create({
        doc: diskTextRef.current,
        extensions: [
          basicSetup,
          yaml(),
          oneDark,
          THEME,
          keymap.of([{ key: 'Mod-s', run: () => (saveRef.current(), true) }, indentWithTab]),
          EditorView.updateListener.of((update) => {
            if (!update.docChanged) return
            dirtyRef.current(update.state.doc.toString() !== diskTextRef.current)
          })
        ]
      })
    })
    viewRef.current = view
    return () => {
      view.destroy()
      viewRef.current = null
    }
  }, [tabId])

  // Disk/tanim degisince (kayit sonrasi ya da disaridan duzenleme) temiz editoru guncelle.
  useEffect(() => {
    diskTextRef.current = diskText
    const view = viewRef.current
    if (!view || dirty) return
    const current = view.state.doc.toString()
    if (current === diskText) return
    view.dispatch({ changes: { from: 0, to: current.length, insert: diskText } })
  }, [diskText, dirty])

  useEffect(() => {
    if (visible) requestAnimationFrame(() => viewRef.current?.focus())
  }, [visible])

  return { hostRef, save: () => saveRef.current() }
}
