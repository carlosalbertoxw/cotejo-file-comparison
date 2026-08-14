import { describe, expect, it } from 'vitest'
import { pushEntry, type HistoryEntry } from '@renderer/state/historyStore'

function entry(leftPath: string, rightPath = 'der', openedAt = 1): HistoryEntry {
  return { kind: 'text', leftPath, rightPath, openedAt }
}

describe('pushEntry', () => {
  it('pone lo ultimo delante', () => {
    const entries = pushEntry(pushEntry([], entry('a')), entry('b'))
    expect(entries.map((item) => item.leftPath)).toEqual(['b', 'a'])
  })

  it('repetir una comparacion la sube en vez de duplicarla', () => {
    const entries = [entry('a'), entry('b'), entry('c')]
    const updated = pushEntry(entries, entry('c', 'der', 99))
    expect(updated.map((item) => item.leftPath)).toEqual(['c', 'a', 'b'])
    expect(updated[0]?.openedAt).toBe(99)
  })

  it('las mismas rutas con distinto tipo son comparaciones distintas', () => {
    const updated = pushEntry([entry('a')], { ...entry('a'), kind: 'dir' })
    expect(updated).toHaveLength(2)
  })

  it('no crece por encima del limite', () => {
    let entries: HistoryEntry[] = []
    for (let i = 0; i < 30; i++) entries = pushEntry(entries, entry(`ruta-${i}`), 5)
    expect(entries).toHaveLength(5)
    expect(entries[0]?.leftPath).toBe('ruta-29')
  })
})
