/**
 * Descargas de la última release, resueltas en tiempo de compilación.
 *
 * La consulta se hace al construir el sitio y no en el navegador: así la página
 * es HTML plano, no gasta la cuota de la API en cada visita y funciona con
 * JavaScript desactivado. El workflow de Pages también se dispara al publicar
 * una release, de modo que los enlaces se regeneran solos.
 *
 * Aquí no hay ni una cadena traducible: cada artefacto se identifica con una
 * clave y el texto sale del catálogo del idioma que toque.
 */

const API = 'https://api.github.com/repos/carlosalbertoxw/cotejo-file-comparison/releases/latest'

const TIMEOUT_MS = 10_000

export type PlatformId = 'windows' | 'macos' | 'linux'

/** Cada variante que se ofrece. Es la clave con la que se busca su texto. */
export type DownloadKey =
  | 'windowsInstaller'
  | 'windowsPortable'
  | 'macArm64Dmg'
  | 'macIntelDmg'
  | 'macArm64Zip'
  | 'macIntelZip'
  | 'linuxDeb'
  | 'linuxRpm'
  | 'linuxAppImage'

export interface Download {
  key: DownloadKey
  url: string
  size: number
  /** La opción recomendada de su plataforma; se pinta destacada. */
  primary: boolean
}

export interface Platform {
  id: PlatformId
  /** Nombre propio del sistema: no se traduce. */
  name: string
  downloads: Download[]
}

export interface Release {
  version: string
  /** Página de la release en GitHub. */
  url: string
  publishedAt: string | null
  platforms: Platform[]
}

interface GitHubAsset {
  name?: string
  browser_download_url?: string
  size?: number
}

interface GitHubRelease {
  tag_name?: string
  html_url?: string
  published_at?: string
  assets?: GitHubAsset[]
}

interface Classified {
  key: DownloadKey
  platform: PlatformId
  primary: boolean
  /** Orden dentro de su plataforma; lo instalable primero. */
  order: number
}

/**
 * Traduce el nombre de un artefacto de electron-builder a la variante que
 * representa, o null si no es algo que ofrecer.
 *
 * Los nombres los fija `electron-builder.yml`: «Cotejo Setup 0.3.0.exe»,
 * «Cotejo 0.3.0 portable.exe», «Cotejo 0.3.0 arm64.dmg», etc. Se clasifica por
 * extensión y por las palabras que ese archivo de configuración garantiza, no
 * por la versión, para que siga funcionando cuando cambie.
 */
export function classifyAsset(name: string): Classified | null {
  const lower = name.toLowerCase()

  // Metadatos del actualizador y mapas de bloques: no son descargas.
  if (lower.endsWith('.blockmap') || lower.endsWith('.yml') || lower.endsWith('.yaml')) return null

  const arm64 = lower.includes('arm64')

  if (lower.endsWith('.exe')) {
    return lower.includes('setup')
      ? { key: 'windowsInstaller', platform: 'windows', primary: true, order: 0 }
      : { key: 'windowsPortable', platform: 'windows', primary: false, order: 1 }
  }

  if (lower.endsWith('.dmg')) {
    return arm64
      ? { key: 'macArm64Dmg', platform: 'macos', primary: true, order: 0 }
      : { key: 'macIntelDmg', platform: 'macos', primary: false, order: 1 }
  }

  if (lower.endsWith('.zip')) {
    return arm64
      ? { key: 'macArm64Zip', platform: 'macos', primary: false, order: 2 }
      : { key: 'macIntelZip', platform: 'macos', primary: false, order: 3 }
  }

  if (lower.endsWith('.deb')) {
    return { key: 'linuxDeb', platform: 'linux', primary: true, order: 0 }
  }

  if (lower.endsWith('.rpm')) {
    return { key: 'linuxRpm', platform: 'linux', primary: false, order: 1 }
  }

  if (lower.endsWith('.appimage')) {
    return { key: 'linuxAppImage', platform: 'linux', primary: false, order: 2 }
  }

  return null
}

const PLATFORM_NAMES: Record<PlatformId, string> = {
  windows: 'Windows',
  macos: 'macOS',
  linux: 'Linux'
}

const PLATFORM_ORDER: PlatformId[] = ['windows', 'macos', 'linux']

export function buildPlatforms(assets: GitHubAsset[]): Platform[] {
  const buckets = new Map<PlatformId, { download: Download; order: number }[]>()

  for (const asset of assets) {
    if (!asset.name || !asset.browser_download_url) continue
    const info = classifyAsset(asset.name)
    if (!info) continue

    const list = buckets.get(info.platform) ?? []
    list.push({
      order: info.order,
      download: {
        key: info.key,
        url: asset.browser_download_url,
        size: asset.size ?? 0,
        primary: info.primary
      }
    })
    buckets.set(info.platform, list)
  }

  const platforms: Platform[] = []
  for (const id of PLATFORM_ORDER) {
    const list = buckets.get(id)
    if (!list || list.length === 0) continue
    list.sort((a, b) => a.order - b.order)
    platforms.push({ id, name: PLATFORM_NAMES[id], downloads: list.map((item) => item.download) })
  }
  return platforms
}

/**
 * Tamaño en MB, que es la única magnitud en la que se mueven estos archivos.
 * El separador decimal sigue al idioma, igual que en la aplicación.
 */
export function formatSize(bytes: number, localeTag: string): string {
  if (!bytes) return ''
  const value = bytes / 1024 / 1024
  const number = new Intl.NumberFormat(localeTag, {
    minimumFractionDigits: 1,
    maximumFractionDigits: 1
  }).format(value)
  return `${number} MB`
}

/** Una sola consulta por compilación, aunque la pidan las cuatro páginas. */
let pending: Promise<Release | null> | null = null

export function getLatestRelease(): Promise<Release | null> {
  pending ??= fetchLatestRelease()
  return pending
}

/**
 * Consulta la última release. Devuelve null si algo falla: un sitio sin
 * enlaces directos pero con el botón a la página de releases sigue sirviendo,
 * y tumbar la compilación porque GitHub tardó en contestar sería peor.
 */
async function fetchLatestRelease(): Promise<Release | null> {
  const headers: Record<string, string> = {
    Accept: 'application/vnd.github+json',
    'User-Agent': 'cotejo-sitio'
  }
  // En CI evita el límite de peticiones anónimas, que se comparte por IP entre
  // todos los runners de GitHub y salta con facilidad.
  const token = process.env.GITHUB_TOKEN
  if (token) headers.Authorization = `Bearer ${token}`

  try {
    const response = await fetch(API, { headers, signal: AbortSignal.timeout(TIMEOUT_MS) })
    if (!response.ok) {
      console.warn(`[sitio] GitHub respondió ${response.status}; se publica sin enlaces directos.`)
      return null
    }

    const release = (await response.json()) as GitHubRelease
    if (typeof release.tag_name !== 'string') return null

    return {
      version: release.tag_name,
      url: release.html_url ?? 'https://github.com/carlosalbertoxw/cotejo-file-comparison/releases',
      publishedAt: release.published_at ?? null,
      platforms: buildPlatforms(release.assets ?? [])
    }
  } catch (error) {
    console.warn('[sitio] No se pudo consultar la última release:', (error as Error).message)
    return null
  }
}
