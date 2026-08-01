// Genera THIRD-PARTY-NOTICES.txt con los avisos de licencia de todo lo que se
// distribuye dentro de la aplicacion.
//
// MIT y BSD piden que el aviso de copyright viaje con las copias del software,
// pero el minificador borra los comentarios legales del bundle, asi que sin
// este archivo el instalador reparte codigo de terceros sin sus avisos.
//
// Las raices no se escriben a mano: se leen de los `import` de src/, porque una
// lista manual se queda desactualizada en cuanto alguien anade una libreria.
// Desde ahi se sigue el `dependencies` de cada paquete hasta cerrar el arbol.
//
// A eso se suman las `dependencies` de produccion del propio proyecto: aunque
// no se importen, electron-builder las copia enteras dentro del asar.

import { readdir, readFile, writeFile } from 'node:fs/promises'
import { dirname, join, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const modules = join(root, 'node_modules')
const target = join(root, 'THIRD-PARTY-NOTICES.txt')

/**
 * Electron no pasa por el bundler y ya reparte sus propios avisos
 * (LICENSE.electron.txt y LICENSES.chromium.html) dentro del paquete.
 */
const EXTERNAL = new Set(['electron'])

const LICENSE_FILES = ['LICENSE', 'LICENSE.md', 'LICENSE.txt', 'LICENCE', 'LICENCE.md', 'COPYING']

async function walkSources(dir, out = []) {
  for (const entry of await readdir(dir, { withFileTypes: true })) {
    const full = join(dir, entry.name)
    if (entry.isDirectory()) await walkSources(full, out)
    else if (/\.(ts|tsx|mts|cts)$/.test(entry.name)) out.push(full)
  }
  return out
}

/** Nombre del paquete a partir del especificador: '@scope/pkg/sub' -> '@scope/pkg'. */
function packageOf(specifier) {
  const parts = specifier.split('/')
  return specifier.startsWith('@') ? parts.slice(0, 2).join('/') : parts[0]
}

async function importedPackages() {
  const found = new Set()
  const pattern = /(?:from|import)\s*\(?\s*['"]([^'"]+)['"]/g

  for (const file of await walkSources(join(root, 'src'))) {
    const source = await readFile(file, 'utf8')
    for (const [, specifier] of source.matchAll(pattern)) {
      if (/^[.]/.test(specifier)) continue
      if (specifier.startsWith('node:')) continue
      if (specifier.startsWith('@shared/') || specifier.startsWith('@renderer/')) continue
      const name = packageOf(specifier)
      if (!EXTERNAL.has(name)) found.add(name)
    }
  }
  return found
}

async function readPackage(name) {
  try {
    return JSON.parse(await readFile(join(modules, name, 'package.json'), 'utf8'))
  } catch {
    return null
  }
}

async function readLicenseText(name) {
  for (const candidate of LICENSE_FILES) {
    try {
      return (await readFile(join(modules, name, candidate), 'utf8')).trim()
    } catch {
      // siguiente candidato
    }
  }
  return null
}

async function collect(name, seen) {
  if (seen.has(name)) return
  const pkg = await readPackage(name)
  if (!pkg) {
    // Un paquete importado que no se resuelve significa un arbol incompleto:
    // mejor parar que publicar avisos a los que les falta alguien.
    throw new Error(`no se encontro node_modules/${name}; ejecuta npm install`)
  }

  const declared =
    typeof pkg.license === 'string' ? pkg.license : (pkg.license?.type ?? 'sin declarar')

  seen.set(name, {
    version: pkg.version,
    license: declared,
    text: await readLicenseText(name),
    homepage: pkg.homepage ?? (typeof pkg.repository === 'string' ? pkg.repository : pkg.repository?.url)
  })

  for (const dependency of Object.keys(pkg.dependencies ?? {})) await collect(dependency, seen)
}

const own = JSON.parse(await readFile(join(root, 'package.json'), 'utf8'))
const roots = new Set([
  ...(await importedPackages()),
  ...Object.keys(own.dependencies ?? {}).filter((name) => !EXTERNAL.has(name))
])

const seen = new Map()
for (const name of roots) await collect(name, seen)

const entries = [...seen.entries()].sort(([a], [b]) => a.localeCompare(b))
const missing = entries.filter(([, info]) => info.text === null)

const header = `Avisos de terceros — Cotejo
${'='.repeat(72)}

Cotejo se distribuye bajo licencia MIT (ver LICENSE). Este archivo reune los
avisos de copyright del software de terceros incluido en la aplicacion, tal y
como exigen sus licencias.

Paquetes incluidos: ${entries.length}
Generado por scripts/make-notices.mjs — no editar a mano.

Electron aparte: reparte sus propios avisos junto al ejecutable, en
LICENSE.electron.txt y LICENSES.chromium.html.
`

const body = entries
  .map(([name, info]) => {
    const lines = [
      '',
      '='.repeat(72),
      `${name}@${info.version}`,
      `Licencia: ${info.license}`
    ]
    if (info.homepage) lines.push(`Origen: ${String(info.homepage).replace(/^git\+|\.git$/g, '')}`)
    lines.push('='.repeat(72), '')
    lines.push(info.text ?? `(el paquete no incluye el texto de la licencia; declara ${info.license})`)
    return lines.join('\n')
  })
  .join('\n')

// Con BOM: es un .txt que se abre a mano en Windows, y sin el hay visores que
// lo leen como ANSI y destrozan los acentos y los nombres de los autores.
await writeFile(target, `﻿${header}${body}\n`, 'utf8')

console.log(`avisos generados: THIRD-PARTY-NOTICES.txt (${entries.length} paquetes)`)
const licenses = new Map()
for (const [, info] of entries) licenses.set(info.license, (licenses.get(info.license) ?? 0) + 1)
for (const [license, count] of [...licenses].sort((a, b) => b[1] - a[1])) {
  console.log(`  ${String(count).padStart(3)}  ${license}`)
}
if (missing.length > 0) {
  console.warn(`\naviso: sin archivo de licencia propio: ${missing.map(([n]) => n).join(', ')}`)
}
