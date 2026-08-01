import { StateEffect, StateField, type EditorState } from '@codemirror/state'
import { Decoration, EditorView, WidgetType, type DecorationSet } from '@codemirror/view'
import type { AlignedRow, InlineRange, RowStatus, Side } from '@shared/types'

/**
 * Todo lo que un panel necesita saber de la rejilla alineada, ya proyectado
 * sobre su propio documento.
 */
export interface SideAlignment {
  /** Cuantas filas de relleno van justo antes de esta linea. */
  gapsBefore: Map<number, number>
  /** Relleno al final del documento, cuando el otro lado es mas largo. */
  trailingGap: number
  lineStatus: Map<number, RowStatus>
  inline: Map<number, InlineRange[]>
}

export function deriveAlignment(rows: AlignedRow[], side: Side): SideAlignment {
  const gapsBefore = new Map<number, number>()
  const lineStatus = new Map<number, RowStatus>()
  const inline = new Map<number, InlineRange[]>()
  let pendingGap = 0

  for (const row of rows) {
    const line = side === 'left' ? row.left : row.right
    if (line === null) {
      pendingGap++
      continue
    }
    if (pendingGap > 0) {
      gapsBefore.set(line, pendingGap)
      pendingGap = 0
    }
    lineStatus.set(line, row.status)
    const ranges = side === 'left' ? row.leftInline : row.rightInline
    if (ranges && ranges.length > 0) inline.set(line, ranges)
  }

  return { gapsBefore, trailingGap: pendingGap, lineStatus, inline }
}

/** Fila de la rejilla en la que empieza una linea del documento. */
export function rowOfLine(rows: AlignedRow[], side: Side, line: number): number {
  for (let i = 0; i < rows.length; i++) {
    const value = side === 'left' ? rows[i]?.left : rows[i]?.right
    if (value === line) return i
  }
  return 0
}

/**
 * Hueco: un bloque vacio de la altura exacta de N lineas.
 *
 * Es la pieza que mantiene los dos paneles cuadrados. Su altura se expresa en
 * multiplos de --line-height, la misma variable que fija el alto de linea del
 * editor, asi que ambos siempre coinciden aunque cambie el tamano de fuente.
 */
class GapWidget extends WidgetType {
  constructor(readonly lines: number) {
    super()
  }

  eq(other: GapWidget): boolean {
    return other.lines === this.lines
  }

  toDOM(): HTMLElement {
    const element = document.createElement('div')
    element.className = 'cm-diff-gap'
    element.style.height = `calc(var(--line-height) * ${this.lines})`
    return element
  }

  get estimatedHeight(): number {
    return -1
  }

  ignoreEvent(): boolean {
    return false
  }
}

const STATUS_CLASS: Record<RowStatus, string> = {
  equal: '',
  ignored: 'cm-diff-ignored',
  changed: 'cm-diff-changed',
  leftOnly: 'cm-diff-orphan',
  rightOnly: 'cm-diff-orphan'
}

const inlineMark = Decoration.mark({ class: 'cm-diff-inline' })

function buildDecorations(state: EditorState, alignment: SideAlignment | null): DecorationSet {
  if (!alignment) return Decoration.none

  const decorations: { from: number; to: number; value: Decoration }[] = []
  const lineCount = state.doc.lines

  for (const [line, count] of alignment.gapsBefore) {
    if (line >= lineCount) continue
    const pos = state.doc.line(line + 1).from
    decorations.push({
      from: pos,
      to: pos,
      value: Decoration.widget({ widget: new GapWidget(count), block: true, side: -1 })
    })
  }

  for (const [line, status] of alignment.lineStatus) {
    const className = STATUS_CLASS[status]
    if (!className || line >= lineCount) continue
    const pos = state.doc.line(line + 1).from
    decorations.push({ from: pos, to: pos, value: Decoration.line({ class: className }) })
  }

  for (const [line, spans] of alignment.inline) {
    if (line >= lineCount) continue
    const info = state.doc.line(line + 1)
    for (const span of spans) {
      const from = info.from + Math.min(span.from, info.length)
      const to = info.from + Math.min(span.to, info.length)
      if (to > from) decorations.push({ from, to, value: inlineMark })
    }
  }

  if (alignment.trailingGap > 0) {
    decorations.push({
      from: state.doc.length,
      to: state.doc.length,
      value: Decoration.widget({
        widget: new GapWidget(alignment.trailingGap),
        block: true,
        side: 1
      })
    })
  }

  return Decoration.set(
    decorations.map(({ from, to, value }) => value.range(from, to)),
    true
  )
}

export const setAlignment = StateEffect.define<SideAlignment | null>()

export const alignmentField = StateField.define<DecorationSet>({
  create: () => Decoration.none,
  update(decorations, transaction) {
    for (const effect of transaction.effects) {
      if (effect.is(setAlignment)) return buildDecorations(transaction.state, effect.value)
    }
    // Mientras se recalcula el diff, arrastramos las decoraciones viejas por
    // encima de la edicion: es preferible un instante de desfase a un parpadeo.
    return transaction.docChanged ? decorations.map(transaction.changes) : decorations
  },
  provide: (field) => EditorView.decorations.from(field)
})
