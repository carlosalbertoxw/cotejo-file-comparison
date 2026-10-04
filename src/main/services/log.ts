import { appendFile, mkdir, rename } from 'node:fs/promises'
import { join } from 'node:path'

/**
 * Registro de errores del proceso principal.
 *
 * Existe para poder contestar a «la copia fallo a medias» con algo mas que la
 * frase que salio en la barra de estado: que operacion, sobre que archivo y
 * con que error del sistema. Solo se anotan fallos y nunca el contenido de un
 * archivo, solo su ruta. No sale del equipo: es un archivo de texto que el
 * usuario puede abrir, borrar o adjuntar a un issue si quiere.
 *
 * Un archivo por sesion. El primer error de una sesion pasa el registro que
 * hubiera a `cotejo.old.log` y empieza uno nuevo; una sesion sin errores no
 * toca nada, asi que el registro de la ultima que fallo sigue ahi despues de
 * reiniciar. Como mucho hay dos archivos.
 *
 * El tope se cuenta en memoria y no mirando el archivo: comprobar su tamano y
 * escribir despues son dos accesos, y entre medias el archivo puede cambiar o
 * ser otro. Aqui no se mira nunca, solo se escribe.
 */

export const LOG_FILE = 'cotejo.log'
export const OLD_LOG_FILE = 'cotejo.old.log'
const MAX_BYTES = 1024 * 1024

export interface Log {
  /** Anota un error. La promesa no falla nunca: un registro roto no tumba nada. */
  error: (scope: string, error: unknown) => Promise<void>
}

function describeError(error: unknown): string {
  const text = error instanceof Error ? error.message : String(error)
  // Una entrada por linea, para poder leerlo y filtrarlo con cualquier cosa.
  return text.replace(/\r?\n/g, ' ⏎ ')
}

export function createLog(dir: string, maxBytes = MAX_BYTES): Log {
  const file = join(dir, LOG_FILE)
  // Las escrituras van en fila: dos errores a la vez no deben intercalarse ni
  // empezar el archivo de la sesion dos veces.
  let queue: Promise<void> = Promise.resolve()
  /** Bytes escritos en esta sesion; `null` mientras no haya habido ninguno. */
  let written: number | null = null
  /** Ya se llego al tope y se aviso; hasta el proximo arranque no se escribe. */
  let full = false

  async function write(line: string): Promise<void> {
    if (written === null) {
      await mkdir(dir, { recursive: true })
      // Si no hay registro anterior, rename falla y no pasa nada.
      await rename(file, join(dir, OLD_LOG_FILE)).catch(() => undefined)
      written = 0
    }
    if (full) return

    const bytes = Buffer.byteLength(line)
    if (written + bytes > maxBytes) {
      // Una ultima linea que lo diga, para que el silencio no parezca calma.
      full = true
      const notice = `${new Date().toISOString()} ERROR [registro] Lleno: no se anota nada mas `
        + 'hasta el proximo arranque\n'
      await appendFile(file, notice, 'utf8')
      return
    }
    written += bytes
    await appendFile(file, line, 'utf8')
  }

  return {
    error(scope, error) {
      const line = `${new Date().toISOString()} ERROR [${scope}] ${describeError(error)}\n`
      queue = queue.then(() => write(line)).catch(() => undefined)
      return queue
    }
  }
}

let current: Log | null = null

/**
 * Se llama una vez al arrancar, cuando ya se sabe la carpeta de registros.
 *
 * La carpeta se crea ya, vacia, aunque el archivo espere al primer error: el
 * boton de «Acerca de» la abre en el explorador, y una carpeta que no existe
 * no se puede ensenar.
 */
export function initLog(dir: string): void {
  current = createLog(dir)
  void mkdir(dir, { recursive: true }).catch(() => undefined)
}

/** Anota un error si el registro esta iniciado; en las pruebas no lo esta. */
export function logError(scope: string, error: unknown): void {
  void current?.error(scope, error)
}
