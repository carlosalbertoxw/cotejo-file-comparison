/**
 * Si una URL es la de nuestra pagina.
 *
 * En produccion la pagina es un `file:` concreto, y se compara la ruta: otro
 * HTML del disco tambien es `file:`, y su origen es el mismo (`null`). En
 * desarrollo es el servidor de Vite, y basta con el origen, porque la ruta
 * cambia con la recarga en caliente. La consulta y el fragmento no cuentan.
 */
export function isAppUrl(url: string, appUrl: string): boolean {
  let actual: URL
  let expected: URL
  try {
    actual = new URL(url)
    expected = new URL(appUrl)
  } catch {
    return false
  }
  if (expected.protocol === 'file:') {
    return actual.protocol === 'file:' && actual.pathname === expected.pathname
  }
  return actual.origin === expected.origin
}
