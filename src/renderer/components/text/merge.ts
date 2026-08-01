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

function linesText(view: EditorView, range: LineRange): string[] {
  const doc = view.state.doc
  const out: string[] = []
  for (let line = range.start; line < range.end && line < doc.lines; line++) {
    out.push(doc.line(line + 1).text)
  }
  return out
}

/**
 * Copia un rango de lineas del panel origen sobre el rango correspondiente del
 * panel destino.
 *
 * Se aplica como una transaccion normal de CodeMirror, no como una reescritura
 * del documento, para que el merge entre en el historial y Ctrl+Z lo deshaga
 * como cualquier otra edicion.
 */
export function replaceLines(
  source: EditorView,
  target: EditorView,
  sourceRange: LineRange,
  targetRange: LineRange
): void {
  const doc = target.state.doc
  const view: DocView = {
    length: doc.length,
    lines: doc.lines,
    lineStart: (line) => doc.line(line + 1).from
  }

  const change = computeMergeChange(linesText(source, sourceRange), view, targetRange)
  target.dispatch({ changes: change, scrollIntoView: false })
}
