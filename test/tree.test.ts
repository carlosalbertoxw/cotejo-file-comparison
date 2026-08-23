import { describe, expect, it } from 'vitest'
import type { DirNode, NodeStatus } from '../src/shared/types'
import { walkTree } from '../src/renderer/components/dir/tree'

function dir(relPath: string, status: NodeStatus, children: DirNode[] = []): DirNode {
  return {
    relPath,
    name: relPath.split('/').pop() ?? '',
    isDir: true,
    left: null,
    right: null,
    status,
    children
  }
}

function file(relPath: string, status: NodeStatus): DirNode {
  return {
    relPath,
    name: relPath.split('/').pop() ?? '',
    isDir: false,
    left: null,
    right: null,
    status
  }
}

/**
 *  raiz
 *  ├── a.txt            (different)
 *  ├── docs/            (dirDiffers)
 *  │   ├── uno.md       (same)
 *  │   └── hondo/       (dirDiffers)
 *  │       └── dos.md   (leftOnly)
 *  └── nueva/           (leftOnly)
 *      └── tres.md      (leftOnly)
 */
const root = dir('', 'dirDiffers', [
  file('a.txt', 'different'),
  dir('docs', 'dirDiffers', [
    file('docs/uno.md', 'same'),
    dir('docs/hondo', 'dirDiffers', [file('docs/hondo/dos.md', 'leftOnly')])
  ]),
  dir('nueva', 'leftOnly', [file('nueva/tres.md', 'leftOnly')])
])

const paths = (nodes: Iterable<DirNode>): string[] => [...nodes].map((node) => node.relPath)

describe('walkTree', () => {
  it('recorre todo el arbol sin devolver la raiz', () => {
    expect(paths(walkTree(root))).toEqual([
      'a.txt',
      'docs',
      'docs/uno.md',
      'docs/hondo',
      'docs/hondo/dos.md',
      'nueva',
      'nueva/tres.md'
    ])
  })

  it('devuelve la carpeta antes que su contenido', () => {
    const result = paths(walkTree(root))
    expect(result.indexOf('docs')).toBeLessThan(result.indexOf('docs/uno.md'))
  })

  it('poda las ramas que el llamante no quiere abrir', () => {
    // Es el caso de sincronizar: una carpeta que solo esta en un lado viaja
    // entera, asi que no hay que bajar a mirar lo que tiene dentro.
    const result = paths(walkTree(root, (node) => node.status !== 'leftOnly'))
    expect(result).toContain('nueva')
    expect(result).not.toContain('nueva/tres.md')
  })

  it('la poda no impide devolver el nodo podado', () => {
    const result = paths(walkTree(root, () => false))
    expect(result).toEqual(['a.txt', 'docs', 'nueva'])
  })

  it('un arbol vacio no devuelve nada', () => {
    expect(paths(walkTree(dir('', 'dirSame')))).toEqual([])
  })

  it('un nodo sin `children` no rompe el recorrido', () => {
    const suelto = dir('sola', 'dirSame')
    delete suelto.children
    expect(paths(walkTree(dir('', 'dirSame', [suelto])))).toEqual(['sola'])
  })
})
