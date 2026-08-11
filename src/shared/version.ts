// Comparacion de versiones semver, reducida a lo que necesita el aviso de
// actualizacion. Vive en shared porque la usan el proceso principal (al leer la
// etiqueta de la release) y los tests.

interface ParsedVersion {
  numbers: [number, number, number]
  /** Identificadores del prelanzamiento, ya separados por punto. Vacio si es final. */
  prerelease: string[]
}

// Las etiquetas del repositorio llevan «v» delante (v0.1.0) y package.json no.
// Los metadatos de build (+algo) no participan en la comparacion, asi que se
// descartan al parsear.
const SEMVER = /^v?(\d+)\.(\d+)\.(\d+)(?:-([0-9A-Za-z.-]+))?(?:\+[0-9A-Za-z.-]+)?$/

export function parseVersion(value: string): ParsedVersion | null {
  const match = SEMVER.exec(value.trim())
  if (!match) return null
  return {
    numbers: [Number(match[1]), Number(match[2]), Number(match[3])],
    prerelease: match[4] ? match[4].split('.') : []
  }
}

/** Un identificador entero va antes que uno alfanumerico; entre enteros, por valor. */
function comparePrereleaseIds(a: string, b: string): number {
  const numericA = /^\d+$/.test(a)
  const numericB = /^\d+$/.test(b)
  if (numericA && numericB) return Math.sign(Number(a) - Number(b))
  if (numericA !== numericB) return numericA ? -1 : 1
  return a < b ? -1 : a > b ? 1 : 0
}

/** -1 si a es anterior a b, 1 si es posterior, 0 si son la misma version. */
export function compareVersions(a: ParsedVersion, b: ParsedVersion): number {
  for (let index = 0; index < 3; index++) {
    const diff = Math.sign((a.numbers[index] ?? 0) - (b.numbers[index] ?? 0))
    if (diff !== 0) return diff
  }

  // 1.0.0-beta es anterior a 1.0.0: un prelanzamiento nunca gana a su final.
  if (a.prerelease.length === 0 || b.prerelease.length === 0) {
    if (a.prerelease.length === b.prerelease.length) return 0
    return a.prerelease.length === 0 ? 1 : -1
  }

  const length = Math.max(a.prerelease.length, b.prerelease.length)
  for (let index = 0; index < length; index++) {
    const left = a.prerelease[index]
    const right = b.prerelease[index]
    // El que se queda sin identificadores es el anterior: 1.0.0-rc < 1.0.0-rc.1.
    if (left === undefined) return -1
    if (right === undefined) return 1
    const diff = comparePrereleaseIds(left, right)
    if (diff !== 0) return diff
  }
  return 0
}

/**
 * Como se ensena una version en la interfaz. Las etiquetas del repositorio ya
 * traen la «v» y package.json no, asi que sin esto la misma version se veria
 * escrita de dos formas segun de donde venga.
 */
export function formatVersion(value: string): string {
  return value.startsWith('v') ? value : `v${value}`
}

/**
 * Si `candidate` es posterior a `current`. Una version ilegible responde que
 * no: mas vale callar que avisar de una actualizacion inventada.
 */
export function isNewerVersion(candidate: string, current: string): boolean {
  const parsedCandidate = parseVersion(candidate)
  const parsedCurrent = parseVersion(current)
  if (!parsedCandidate || !parsedCurrent) return false
  return compareVersions(parsedCandidate, parsedCurrent) > 0
}
