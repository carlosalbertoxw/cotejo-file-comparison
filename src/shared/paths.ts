/**
 * Union de una raiz con una ruta relativa del arbol de comparacion.
 *
 * El renderer no puede usar `node:path`: con el preload en modo sandbox no hay
 * Node al otro lado del puente. Y las rutas relativas de `DirNode` vienen
 * siempre en formato posix, mientras que la raiz llega tal y como la escribio
 * o la eligio el usuario. Estas dos funciones son toda la logica que hace
 * falta, y estan aqui —y no dentro de un componente— para poder probarlas.
 */

/**
 * El separador que ya usa `root`. Si no tiene ninguno —una raiz como `C:` o un
 * nombre suelto— manda el de la plataforma.
 *
 * Se respeta el de la raiz en vez de imponer el del sistema porque en Windows
 * conviven los dos: una ruta escrita a mano como `C:/proyectos` es valida, y
 * devolver `C:/proyectos\sub\a.txt` funciona pero se lee fatal en la barra de
 * rutas.
 */
export function separatorOf(root: string, platformSeparator: string): string {
  if (root.includes('\\')) return '\\'
  if (root.includes('/')) return '/'
  return platformSeparator
}

/**
 * Une la raiz y la ruta relativa con un solo separador entre medias.
 *
 * Una `relPath` vacia devuelve la raiz sin tocar: es la propia carpeta
 * comparada, no un hijo suyo.
 */
export function joinPath(root: string, relPath: string, platformSeparator: string): string {
  const separator = separatorOf(root, platformSeparator)
  // Sin barras finales duplicadas: `C:\datos\` + `a.txt` no puede dar `C:\datos\\a.txt`.
  const base = root.replace(/[\\/]+$/, '')
  if (relPath === '') return base === '' ? separator : base
  const relative = relPath.split('/').join(separator)
  return `${base}${separator}${relative}`
}
