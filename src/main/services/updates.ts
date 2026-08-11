import { app, net } from 'electron'
import { LATEST_RELEASE_API } from '@shared/links'
import { isNewerVersion } from '@shared/version'
import type { UpdateCheck } from '@shared/types'

/**
 * Cotejo no se actualiza solo: mira si hay una version mas nueva publicada y
 * manda al usuario a la pagina de releases. Descargar y sustituir el ejecutable
 * exigiria firmar la aplicacion, y sin certificado eso no se sostiene.
 *
 * La consulta va por `net.fetch` y no por `fetch` a secas para que herede el
 * proxy y los certificados que ya tenga configurados el sistema; en una red
 * corporativa es la diferencia entre funcionar y no funcionar.
 */

const TIMEOUT_MS = 8000

interface GitHubRelease {
  tag_name?: string
  draft?: boolean
  prerelease?: boolean
}

export async function checkForUpdates(): Promise<UpdateCheck> {
  const current = app.getVersion()
  const response = await net.fetch(LATEST_RELEASE_API, {
    headers: {
      Accept: 'application/vnd.github+json',
      // GitHub rechaza las peticiones sin User-Agent propio.
      'User-Agent': `Cotejo/${current}`
    },
    signal: AbortSignal.timeout(TIMEOUT_MS)
  })

  // Un repositorio sin releases contesta 404, y eso no es un fallo: es que
  // todavia no hay nada mas nuevo que lo que el usuario tiene instalado.
  if (response.status === 404) {
    return { current, latest: null, available: false, checkedAt: Date.now() }
  }
  if (!response.ok) {
    throw new Error(`GitHub respondio ${response.status}`)
  }

  const release = (await response.json()) as GitHubRelease
  const latest = typeof release.tag_name === 'string' ? release.tag_name : null

  return {
    current,
    latest,
    available: latest !== null && isNewerVersion(latest, current),
    checkedAt: Date.now()
  }
}
