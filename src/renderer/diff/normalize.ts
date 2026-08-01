import type { DiffOptions } from '@shared/types'

/** Parte un documento en lineas. Asume que el contenido ya viene normalizado a LF. */
export function splitLines(text: string): string[] {
  if (text === '') return []
  return text.split('\n')
}

/** Expande tabulaciones a columnas reales, respetando las paradas de tabulacion. */
export function expandTabs(line: string, tabSize: number): string {
  if (!line.includes('\t')) return line
  let out = ''
  for (const char of line) {
    if (char === '\t') out += ' '.repeat(tabSize - (out.length % tabSize))
    else out += char
  }
  return out
}

/**
 * Reduce una linea a la clave con la que se compara.
 *
 * El texto original nunca se toca: las opciones solo cambian *que* se considera
 * una diferencia, no lo que se muestra. Por eso `ignoreWhitespace` colapsa los
 * espacios en la clave, pero el panel sigue pintando la linea tal cual esta en
 * disco.
 */
export function normalizeLine(line: string, options: DiffOptions): string {
  let key = line

  if (options.ignoreWhitespace) {
    // Colapsar y recortar: la indentacion y el espaciado interno dejan de contar.
    key = key.replace(/\s+/g, ' ').trim()
  } else {
    key = expandTabs(key, options.tabSize)
    // El retorno de carro suelto nunca debe contar como diferencia real.
    key = key.replace(/\r$/, '')
  }

  if (options.ignoreCase) key = key.toLowerCase()

  return key
}

export function isBlank(line: string): boolean {
  return line.trim() === ''
}

/**
 * Prepara un documento para el diff: devuelve las claves de comparacion y el
 * mapa de vuelta al indice de linea real.
 *
 * Con `ignoreBlankLines` las lineas en blanco se sacan de la secuencia que se
 * compara, pero siguen existiendo en el documento; `originalIndex` es lo que
 * permite volver a colocarlas al construir las filas alineadas.
 */
export interface PreparedDoc {
  lines: string[]
  keys: string[]
  originalIndex: number[]
}

export function prepareDoc(text: string, options: DiffOptions): PreparedDoc {
  const lines = splitLines(text)
  const keys: string[] = []
  const originalIndex: number[] = []

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i] as string
    if (options.ignoreBlankLines && isBlank(line)) continue
    keys.push(normalizeLine(line, options))
    originalIndex.push(i)
  }

  return { lines, keys, originalIndex }
}
