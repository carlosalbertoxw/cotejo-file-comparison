import type { DirNode, FileOpItem, Side } from '@shared/types'
import { isDifference } from './tree'

/**
 * Lo que copiar o mover la seleccion lleva al otro lado: exactamente lo que la
 * tabla lista bajo cada elemento seleccionado.
 *
 * Antes una carpeta viajaba entera, con lo que el escaneo habia dejado fuera
 * —ocultos, excluidos por los filtros, enlaces— y, con «Solo diferencias», con
 * los archivos iguales, que se sobrescribian mandando cada copia del destino a
 * la papelera. Ahora cada cosa listada va como elemento propio, y la carpeta
 * solo se crea en el destino.
 *
 * El arbol de la comparacion ya es lo listado: el escaneo no mete en el lo que
 * los filtros excluyen. Solo falta aplicar «Solo diferencias», con la misma
 * regla que `flattenTree`. Que una carpeta este colapsada no importa: al
 * seleccionarla se piden sus contenidos aunque no esten desplegados.
 */
export function listedItems(
  selected: Iterable<DirNode>,
  from: Side,
  onlyDifferences: boolean
): FileOpItem[] {
  const items = new Map<string, FileOpItem>()

  const visit = (node: DirNode): void => {
    // Lo que no existe en el origen no se puede llevar a ningun sitio. En un
    // conflicto de tipos manda el lado de origen: puede ser carpeta en uno y
    // archivo en el otro.
    const entry = node[from]
    if (!entry || items.has(node.relPath)) return
    items.set(node.relPath, { relPath: node.relPath, isDir: entry.isDir, from })
    if (!entry.isDir) return
    for (const child of node.children ?? []) {
      if (onlyDifferences && !isDifference(child.status)) continue
      visit(child)
    }
  }

  for (const node of selected) visit(node)
  return [...items.values()]
}
