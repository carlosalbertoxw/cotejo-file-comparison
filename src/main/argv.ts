import { existsSync } from 'node:fs'
import { resolve } from 'node:path'

/**
 * Argumentos que son rutas de verdad, ya absolutas.
 *
 * Permite `cotejo izquierda derecha` desde la terminal o desde el explorador.
 * `skip` son los argumentos que no cuentan: el ejecutable y, en desarrollo,
 * tambien el directorio del proyecto que se le pasa a Electron.
 *
 * Una ruta relativa se resuelve contra la carpeta desde la que se lanzo esa
 * orden, no contra la del proceso que la recibe. Con Cotejo ya abierto, la
 * segunda instancia le pasa su argv a la primera, que vive en otra carpeta:
 * comprobar `notas.txt` ahi no abria nada o, peor, abria y dejaba guardar un
 * `notas.txt` distinto del que se pidio. Y una relativa guardada en la sesion
 * o en el historial deja de apuntar al mismo archivo en el siguiente arranque.
 */
export function pathsFromArgv(argv: string[], workingDirectory: string, skip: number): string[] {
  return argv
    .slice(skip)
    .filter((argument) => !argument.startsWith('-'))
    .map((argument) => resolve(workingDirectory, argument))
    .filter((path) => existsSync(path))
    .slice(0, 2)
}
