import { ChangeSet, type Text } from '@codemirror/state'
import type { EditorView } from '@codemirror/view'

export interface LineRange {
  /** Indices 0-based, semiabierto [start, end). */
  start: number
  end: number
}

export interface MergeChange {
  from: number
  to: number
  insert: string
}

/** Vista minima de un documento; asi el calculo se puede probar sin CodeMirror. */
export interface DocView {
  /** Longitud total en caracteres. */
  length: number
  /** Numero de lineas. */
  lines: number
  /** Posicion del primer caracter de la linea (0-based). */
  lineStart: (line: number) => number
}

export function docViewOf(text: string): DocView {
  const starts = [0]
  for (let i = 0; i < text.length; i++) {
    if (text[i] === '\n') starts.push(i + 1)
  }
  return {
    length: text.length,
    lines: starts.length,
    lineStart: (line) => starts[line] as number
  }
}

/**
 * Traduce "sustituye estas lineas del destino por estas otras del origen" a un
 * cambio de caracteres.
 *
 * Los saltos de linea son toda la dificultad: hay que anadir uno cuando el
 * texto insertado no llega al final del documento, ponerlo delante cuando se
 * anade al final de un archivo que no termina en salto, y llevarse el anterior
 * cuando el borrado se come el final del documento.
 */
export function computeMergeChange(
  sourceLines: string[],
  target: DocView,
  targetRange: LineRange
): MergeChange {
  let from =
    targetRange.start >= target.lines ? target.length : target.lineStart(targetRange.start)
  const to = targetRange.end >= target.lines ? target.length : target.lineStart(targetRange.end)

  let insert = sourceLines.join('\n')

  if (insert === '') {
    // Borrado puro: si nos llevamos el final del documento hay que llevarse
    // tambien el salto de linea anterior, o queda una linea vacia de mas.
    if (to >= target.length && from > 0) from -= 1
  } else if (to < target.length) {
    // El rango sustituido termina antes del final, asi que el texto insertado
    // necesita su propio salto para no pegarse a la linea siguiente.
    insert += '\n'
  } else if (from === target.length && target.length > 0) {
    // Insercion al final de un documento que no acaba en salto de linea.
    insert = `\n${insert}`
  }

  return { from, to: Math.max(from, to), insert }
}

function linesText(doc: Text, range: LineRange): string[] {
  const out: string[] = []
  for (let line = range.start; line < range.end && line < doc.lines; line++) {
    out.push(doc.line(line + 1).text)
  }
  return out
}

/** Un tramo del origen y el tramo del destino que sustituye. */
export interface LineTransfer {
  source: LineRange
  target: LineRange
}

/**
 * Todos los tramos a la vez, como un solo cambio sobre el documento destino.
 *
 * Se aplican de abajo arriba, cada uno calculado sobre el resultado del
 * anterior: asi lo de arriba no se descoloca por lo que crece o encoge debajo,
 * y `computeMergeChange` sigue viendo un documento de verdad para decidir sus
 * saltos de linea. Dos inserciones en el mismo punto quedan en el orden del
 * origen. Al final se componen en un unico `ChangeSet` relativo al original.
 */
export function transferChanges(
  source: Text,
  target: Text,
  transfers: LineTransfer[]
): ChangeSet {
  const ordered = [...transfers].sort(
    (a, b) => b.target.start - a.target.start || b.source.start - a.source.start
  )
  let doc = target
  let changes = ChangeSet.empty(target.length)
  for (const transfer of ordered) {
    const current = doc
    const view: DocView = {
      length: current.length,
      lines: current.lines,
      lineStart: (line) => current.line(line + 1).from
    }
    const step = ChangeSet.of(
      computeMergeChange(linesText(source, transfer.source), view, transfer.target),
      current.length
    )
    changes = changes.compose(step)
    doc = step.apply(current)
  }
  return changes
}

/**
 * Copia tramos de lineas del panel origen sobre los tramos correspondientes
 * del panel destino.
 *
 * Se aplica como una transaccion normal de CodeMirror, no como una reescritura
 * del documento, para que el merge entre en el historial y un solo Ctrl+Z lo
 * deshaga entero, como cualquier otra edicion.
 */
export function replaceLines(
  source: EditorView,
  target: EditorView,
  transfers: LineTransfer[]
): void {
  if (transfers.length === 0) return
  const changes = transferChanges(source.state.doc, target.state.doc, transfers)
  target.dispatch({ changes, scrollIntoView: false })
}
