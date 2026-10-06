import { samePath } from '../../state/sessionStore'

export interface OperableRoots {
  leftRoot: string
  rightRoot: string
}

/**
 * Las raices sobre las que se puede copiar, mover o borrar desde la tabla, o
 * `null` si ahora mismo no se puede.
 *
 * La tabla y la seleccion salen de la ultima comparacion terminada, y las rutas
 * de la pestana cambian en cuanto se escribe otra. Operar con las rutas nuevas
 * y el arbol viejo mandaba a la papelera o escribia `<raiz nueva>/<ruta vieja>`
 * con un dialogo que solo ensenaba rutas relativas. Por eso las raices son las
 * de la comparacion, y no hay operaciones mientras se compara ni cuando lo que
 * se ve ya no corresponde a las rutas de la pestana.
 */
export function operableRoots(
  compared: OperableRoots | null,
  leftPath: string | null,
  rightPath: string | null,
  running: boolean
): OperableRoots | null {
  if (!compared || running) return null
  if (!samePath(compared.leftRoot, leftPath) || !samePath(compared.rightRoot, rightPath)) {
    return null
  }
  return { leftRoot: compared.leftRoot, rightRoot: compared.rightRoot }
}
