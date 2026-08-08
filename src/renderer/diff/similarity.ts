/**
 * Emparejado de lineas por parecido.
 *
 * El diff por lineas razona con igualdad exacta: dos lineas coinciden o no.
 * Eso basta para saber *que* cambio, pero no para decidir que linea de la
 * izquierda es la version anterior de que linea de la derecha dentro de un
 * bloque modificado. Para eso hace falta una nocion de "se parecen", y es lo
 * que vive aqui.
 *
 * La medida es el coeficiente de Dice sobre bigramas de caracteres: reconoce
 * una linea retocada aunque le hayan cambiado la indentacion, un identificador
 * o el final, y no se deja enganar por dos lineas que solo comparten palabras
 * sueltas.
 */

/** Por debajo de esto dos lineas no son "la misma linea retocada". */
const MIN_SIMILARITY = 0.45

/**
 * Tope al peso de una linea. Una coincidencia vale tantos puntos como
 * caracteres explica, para que un `{` suelto nunca desplace a una linea larga;
 * pasada esta longitud, mas caracteres ya no la hacen mas fiable.
 */
const MAX_WEIGHT = 60

/**
 * Tope de celdas de la matriz. La alineacion es O(n*m) en tiempo y memoria, asi
 * que los bloques enormes se dejan sin anclas y el llamante los empareja
 * posicionalmente, que es barato y no bloquea la interfaz.
 */
export const MAX_ALIGNABLE_CELLS = 250_000

type Bigrams = Map<string, number>

function bigramsOf(text: string): Bigrams {
  const grams: Bigrams = new Map()
  for (let i = 0; i + 1 < text.length; i++) {
    const gram = text.slice(i, i + 2)
    grams.set(gram, (grams.get(gram) ?? 0) + 1)
  }
  return grams
}

/** Coeficiente de Dice: bigramas compartidos sobre bigramas totales. */
function dice(aLength: number, aGrams: Bigrams, bLength: number, bGrams: Bigrams): number {
  const total = aLength - 1 + (bLength - 1)
  if (total <= 0) return 0

  const [small, large] = aGrams.size <= bGrams.size ? [aGrams, bGrams] : [bGrams, aGrams]
  let shared = 0
  for (const [gram, count] of small) {
    const other = large.get(gram)
    if (other !== undefined) shared += Math.min(count, other)
  }

  return (2 * shared) / total
}

function weightOf(aLength: number, bLength: number): number {
  return Math.min(MAX_WEIGHT, Math.max(1, Math.max(aLength, bLength)))
}

/**
 * Puntos que suma emparejar estas dos lineas, o 0 si no se parecen lo bastante.
 *
 * El descarte por longitud de antes de calcular Dice no es solo una
 * optimizacion: es lo que mantiene el coste manejable, porque en un bloque
 * grande la inmensa mayoria de los pares ni siquiera son candidatos.
 */
function pairScore(a: string, aGrams: Bigrams, b: string, bGrams: Bigrams): number {
  if (a === b) return weightOf(a.length, b.length)
  if (a.length < 2 || b.length < 2) return 0

  const shortest = Math.min(a.length, b.length) - 1
  const longest = Math.max(a.length, b.length) - 1
  // Cota superior de Dice: aunque coincidieran todos los bigramas de la corta.
  if (2 * shortest < MIN_SIMILARITY * (shortest + longest)) return 0

  const similarity = dice(a.length, aGrams, b.length, bGrams)
  if (similarity < MIN_SIMILARITY) return 0
  return similarity * weightOf(a.length, b.length)
}

/** Un par de lineas que el alineador considera la misma linea a los dos lados. */
export interface LineMatch {
  left: number
  right: number
}

const DIAG = 0
const UP = 1
const LEFT = 2

/**
 * Busca las parejas de lineas parecidas entre dos tramos, sin cruces.
 *
 * Es un alineamiento global (Needleman-Wunsch) que maximiza los caracteres
 * explicados: los huecos no penalizan, de modo que el resultado son solo las
 * parejas de las que se puede estar razonablemente seguro. Lo que quede entre
 * dos parejas es cosa del llamante; aqui no se inventan correspondencias.
 *
 * Las claves deben venir ya normalizadas (sin indentacion), porque lo que se
 * mide es el parecido del contenido, no el del formato.
 */
export function matchSimilarLines(leftKeys: string[], rightKeys: string[]): LineMatch[] {
  const n = leftKeys.length
  const m = rightKeys.length
  if (n === 0 || m === 0) return []
  if (n * m > MAX_ALIGNABLE_CELLS) return []

  const leftGrams = leftKeys.map(bigramsOf)
  const rightGrams = rightKeys.map(bigramsOf)

  const width = m + 1
  const choices = new Uint8Array(width * (n + 1))
  let previous = new Float64Array(width)
  let current = new Float64Array(width)

  for (let i = 1; i <= n; i++) {
    const a = leftKeys[i - 1] as string
    const aGrams = leftGrams[i - 1] as Bigrams
    const row = i * width
    current[0] = 0
    choices[row] = UP

    for (let j = 1; j <= m; j++) {
      // Empates a favor del hueco: si emparejar no gana nada, las lineas
      // sueltas se quedan donde estan en vez de deslizarse.
      let best = previous[j] as number
      let choice = UP

      const sideways = current[j - 1] as number
      if (sideways > best) {
        best = sideways
        choice = LEFT
      }

      const score = pairScore(a, aGrams, rightKeys[j - 1] as string, rightGrams[j - 1] as Bigrams)
      if (score > 0) {
        const diagonal = (previous[j - 1] as number) + score
        if (diagonal > best) {
          best = diagonal
          choice = DIAG
        }
      }

      current[j] = best
      choices[row + j] = choice
    }

    const swap = previous
    previous = current
    current = swap
  }

  const matches: LineMatch[] = []
  let i = n
  let j = m
  while (i > 0 && j > 0) {
    const choice = choices[i * width + j]
    if (choice === DIAG) {
      matches.push({ left: i - 1, right: j - 1 })
      i--
      j--
    } else if (choice === UP) {
      i--
    } else {
      j--
    }
  }

  return matches.reverse()
}
