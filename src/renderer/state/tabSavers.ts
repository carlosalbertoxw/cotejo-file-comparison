/**
 * Quien sabe guardar cada pestana.
 *
 * Guardar vive dentro de la vista de texto, con su estado y sus dialogos de
 * conflicto; cerrar una pestana se decide fuera, en la barra o con el atajo.
 * Este registro los une sin subir al store lo que no se puede persistir.
 */

/** `true` si todo quedo en el disco; `false` si algo fallo o choco. */
type Saver = () => Promise<boolean>

const savers = new Map<string, Saver>()

/** Devuelve la funcion que deshace el registro, para usarla en un efecto. */
export function registerTabSaver(tabId: string, saver: Saver): () => void {
  savers.set(tabId, saver)
  return () => {
    if (savers.get(tabId) === saver) savers.delete(tabId)
  }
}

export async function saveTab(tabId: string): Promise<boolean> {
  const saver = savers.get(tabId)
  return saver ? saver() : true
}
