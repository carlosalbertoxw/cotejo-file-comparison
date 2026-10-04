import { appendFile, mkdir, rename, stat } from 'node:fs/promises'
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
 * El archivo no existe hasta el primer error. Cuando pasa del tamano maximo se
 * renombra a `cotejo.old.log`, que pisa al anterior: como mucho hay dos.
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
  // rotar el archivo dos veces.
  let queue: Promise<void> = Promise.resolve()

  async function write(line: string): Promise<void> {
    await mkdir(dir, { recursive: true })
    const info = await stat(file).catch(() => null)
    if (info && info.size + Buffer.byteLength(line) > maxBytes) {
      await rename(file, join(dir, OLD_LOG_FILE))
    }
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
