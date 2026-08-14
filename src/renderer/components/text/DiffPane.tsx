import { useEffect, useImperativeHandle, useRef } from 'react'
import { Compartment, EditorState, type Extension } from '@codemirror/state'
import { EditorView, keymap, drawSelection } from '@codemirror/view'
import { defaultKeymap, history, historyKeymap } from '@codemirror/commands'
import { alignmentField, setAlignment, type SideAlignment } from './alignment'
import type { LineRange } from './merge'

export interface DiffPaneHandle {
  readonly view: EditorView | null
  readonly scrollDOM: HTMLElement | null
}

interface Props {
  ref?: React.Ref<DiffPaneHandle>
  value: string
  alignment: SideAlignment | null
  readOnly: boolean
  tabSize: number
  onChange: (value: string) => void
  onScroll: (scrollTop: number, scrollLeft: number) => void
  onSelectionChange: (selection: LineRange | null) => void
}

/**
 * Lineas [start, end) que toca la seleccion, o null si no hay seleccion.
 *
 * La transferencia trabaja con lineas enteras, asi que una seleccion parcial
 * arrastra la linea entera. La que termina justo al empezar una linea no la
 * incluye: es lo que se ve subrayado y lo que espera quien selecciona de arriba
 * abajo con el raton.
 */
function lineSelectionOf(state: EditorState): LineRange | null {
  const range = state.selection.main
  if (range.empty) return null
  const start = state.doc.lineAt(range.from).number - 1
  const last = state.doc.lineAt(range.to)
  const end = range.to === last.from && last.number - 1 > start ? last.number - 1 : last.number
  return { start, end }
}

/**
 * Un panel del comparador.
 *
 * CodeMirror aporta unicamente el area de texto editable con virtualizacion; la
 * numeracion de lineas, los colores y las flechas de merge son nuestros y viven
 * fuera del editor. Por eso aqui no se activa `lineNumbers` ni ningun tema.
 */
export function DiffPane({
  ref,
  value,
  alignment,
  readOnly,
  tabSize,
  onChange,
  onScroll,
  onSelectionChange
}: Props): React.JSX.Element {
  const hostRef = useRef<HTMLDivElement>(null)
  const viewRef = useRef<EditorView | null>(null)
  const optionsRef = useRef(new Compartment())

  // Los callbacks se leen por referencia para no recrear el editor en cada render.
  const onChangeRef = useRef(onChange)
  const onScrollRef = useRef(onScroll)
  const onSelectionRef = useRef(onSelectionChange)
  onChangeRef.current = onChange
  onScrollRef.current = onScroll
  onSelectionRef.current = onSelectionChange

  useImperativeHandle(ref, () => ({
    get view() {
      return viewRef.current
    },
    get scrollDOM() {
      return viewRef.current?.scrollDOM ?? null
    }
  }))

  useEffect(() => {
    if (!hostRef.current) return

    const extensions: Extension[] = [
      history(),
      drawSelection(),
      // Sin resaltado de linea activa: su fondo taparia el color del diff.
      keymap.of([...defaultKeymap, ...historyKeymap]),
      alignmentField,
      optionsRef.current.of([]),
      EditorView.updateListener.of((update) => {
        if (update.docChanged) onChangeRef.current(update.state.doc.toString())
        if (update.docChanged || update.selectionSet) {
          onSelectionRef.current(lineSelectionOf(update.state))
        }
      }),
      EditorView.domEventHandlers({
        scroll: (_event, view) => {
          onScrollRef.current(view.scrollDOM.scrollTop, view.scrollDOM.scrollLeft)
        }
      })
    ]

    const view = new EditorView({
      state: EditorState.create({ doc: value, extensions }),
      parent: hostRef.current
    })
    viewRef.current = view

    return () => {
      view.destroy()
      viewRef.current = null
    }
    // Se monta una sola vez; contenido y opciones se aplican en los efectos de abajo.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // Contenido desde fuera (recarga, merge). Solo se reemplaza si de verdad cambio,
  // para no destruir el cursor ni el historial mientras el usuario escribe.
  useEffect(() => {
    const view = viewRef.current
    if (!view) return
    if (view.state.doc.toString() === value) return
    view.dispatch({ changes: { from: 0, to: view.state.doc.length, insert: value } })
  }, [value])

  useEffect(() => {
    viewRef.current?.dispatch({ effects: setAlignment.of(alignment) })
  }, [alignment])

  useEffect(() => {
    viewRef.current?.dispatch({
      effects: optionsRef.current.reconfigure([
        EditorState.readOnly.of(readOnly),
        EditorView.editable.of(!readOnly),
        EditorState.tabSize.of(tabSize)
      ])
    })
  }, [readOnly, tabSize])

  return <div className="diff-pane" ref={hostRef} />
}
