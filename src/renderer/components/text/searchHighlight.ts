import { StateEffect, StateField, type EditorState } from '@codemirror/state'
import { Decoration, EditorView, type DecorationSet } from '@codemirror/view'
import type { Match } from './search'

/**
 * Resaltado de las coincidencias dentro de un panel.
 *
 * Va en un campo propio y no en el de la rejilla alineada porque cambia con lo
 * que se teclea en la caja de busqueda, no con el resultado de la comparacion:
 * mezclarlos obligaria a recalcular las decoraciones del diff en cada letra.
 */

export interface SearchHighlight {
  matches: Match[]
  /** Indice de la coincidencia actual dentro de `matches`, o -1. */
  current: number
}

const matchMark = Decoration.mark({ class: 'cm-search-match' })
const currentMark = Decoration.mark({ class: 'cm-search-match cm-search-current' })

function buildDecorations(state: EditorState, highlight: SearchHighlight | null): DecorationSet {
  if (!highlight) return Decoration.none

  const limit = state.doc.length
  const ranges = []

  for (let i = 0; i < highlight.matches.length; i++) {
    const match = highlight.matches[i]
    if (!match) continue
    // Las posiciones se calcularon sobre el texto que React tiene en la mano;
    // si el documento ya cambio debajo, se recorta en vez de reventar.
    const from = Math.min(match.from, limit)
    const to = Math.min(match.to, limit)
    if (to <= from) continue
    ranges.push((i === highlight.current ? currentMark : matchMark).range(from, to))
  }

  return Decoration.set(ranges, true)
}

export const setSearchHighlight = StateEffect.define<SearchHighlight | null>()

export const searchHighlightField = StateField.define<DecorationSet>({
  create: () => Decoration.none,
  update(decorations, transaction) {
    for (const effect of transaction.effects) {
      if (effect.is(setSearchHighlight)) return buildDecorations(transaction.state, effect.value)
    }
    // Mientras llega el recalculo, las posiciones viejas se arrastran con la
    // edicion: el resaltado sigue encima de su texto en vez de saltar.
    return transaction.docChanged ? decorations.map(transaction.changes) : decorations
  },
  provide: (field) => EditorView.decorations.from(field)
})
