import { diffWordsWithSpace } from 'diff'
import type { InlineRange } from '@shared/types'

/** Por encima de esto, el diff por palabras deja de compensar su coste. */
const MAX_INLINE_LENGTH = 5000

function pushRange(ranges: InlineRange[], from: number, to: number): void {
  if (to <= from) return
  const last = ranges[ranges.length - 1]
  if (last && last.to === from) {
    last.to = to
    return
  }
  ranges.push({ from, to })
}

/** Reduce dos lineas a los tramos que difieren, recortando extremos comunes. */
function trimmedRanges(left: string, right: string): { left: InlineRange[]; right: InlineRange[] } {
  const limit = Math.min(left.length, right.length)

  let prefix = 0
  while (prefix < limit && left[prefix] === right[prefix]) prefix++

  let suffix = 0
  while (
    suffix < limit - prefix &&
    left[left.length - 1 - suffix] === right[right.length - 1 - suffix]
  ) {
    suffix++
  }

  return {
    left: prefix < left.length - suffix ? [{ from: prefix, to: left.length - suffix }] : [],
    right: prefix < right.length - suffix ? [{ from: prefix, to: right.length - suffix }] : []
  }
}

/**
 * Calcula que tramos de caracteres difieren entre dos lineas emparejadas.
 *
 * Se compara por palabras y no por caracteres a proposito: resaltar la palabra
 * completa que cambio se lee mucho mejor que resaltar las tres letras sueltas
 * que casualmente no coinciden.
 */
export function inlineRanges(
  left: string,
  right: string
): { left: InlineRange[]; right: InlineRange[] } {
  if (left === right) return { left: [], right: [] }
  if (left.length > MAX_INLINE_LENGTH || right.length > MAX_INLINE_LENGTH) {
    return trimmedRanges(left, right)
  }

  const leftRanges: InlineRange[] = []
  const rightRanges: InlineRange[] = []
  let leftPos = 0
  let rightPos = 0

  for (const change of diffWordsWithSpace(left, right)) {
    const length = change.value.length
    if (change.added) {
      pushRange(rightRanges, rightPos, rightPos + length)
      rightPos += length
    } else if (change.removed) {
      pushRange(leftRanges, leftPos, leftPos + length)
      leftPos += length
    } else {
      leftPos += length
      rightPos += length
    }
  }

  return { left: leftRanges, right: rightRanges }
}
