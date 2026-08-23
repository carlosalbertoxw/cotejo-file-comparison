import type { DirNode } from '@shared/types'

/**
 * Recorre el arbol de comparacion en profundidad, sin devolver la raiz.
 *
 * Existe porque el mismo bucle estaba escrito cuatro veces, y cada copia
 * decidia por su cuenta en que carpetas entrar. `descend` es lo unico que
 * cambia de un caso a otro: al sincronizar, una carpeta que solo esta en un
 * lado viaja entera y no hay que mirar dentro; al indexar, se mira todo.
 */
export function* walkTree(
  root: DirNode,
  descend: (node: DirNode) => boolean = () => true
): Generator<DirNode> {
  for (const child of root.children ?? []) {
    yield child
    if (child.isDir && descend(child)) yield* walkTree(child, descend)
  }
}
