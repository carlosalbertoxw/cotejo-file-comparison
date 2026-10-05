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

/** Lo que importa del marco que manda un mensaje IPC. */
export interface SenderFrame {
  url: string
  /** El marco padre; `null` en el marco principal de la ventana. */
  parent: unknown
}

/**
 * Si un marco puede hablar con el proceso principal: tiene que existir, ser el
 * marco principal y tener cargada nuestra pagina.
 *
 * Sin marco (ya se destruyo o navego) no hay a quien responder; con padre, es
 * un iframe dentro de la pagina, que nunca deberia hablar con el disco.
 */
export function isTrustedFrame(frame: SenderFrame | null | undefined, appUrl: string): boolean {
  if (!frame || frame.parent !== null) return false
  return isAppUrl(frame.url, appUrl)
}
