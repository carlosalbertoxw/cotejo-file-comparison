// Hook `afterAllArtifactBuild` de electron-builder: la version sin instalar de
// Windows, como un .zip con la carpeta de la aplicacion dentro.
//
// El target `zip` de electron-builder mete los archivos sueltos en la raiz del
// .zip, sin carpeta (lo tiene fijado para todo lo que no es macOS). Con
// «Extraer todo» del Explorador no se nota, pero «Extraer aqui» de 7-Zip o de
// WinRAR desparrama una veintena de archivos donde caiga. Aqui se comprime
// `win-unpacked` entero con la carpeta como raiz, igual que el .tar.gz de
// Linux, que electron-builder ya arma asi.
//
// Lo comprime ZipFile de .NET, que viene con Windows: el empaquetado de
// Windows siempre corre en Windows (lo exige el instalador NSIS), y asi no
// hace falta depender del 7za interno de electron-builder.

import { execFileSync } from 'node:child_process'
import { existsSync, readFileSync, renameSync, rmSync } from 'node:fs'
import { join } from 'node:path'

export default function portableZip(buildResult) {
  const { outDir, configuration, platformToTargets } = buildResult
  const unpacked = join(outDir, 'win-unpacked')
  const builtWindows = [...platformToTargets.keys()].some((platform) => platform.name === 'windows')
  if (!builtWindows || !existsSync(unpacked)) return []

  const { version } = JSON.parse(readFileSync(new URL('../package.json', import.meta.url), 'utf8'))
  // El mismo nombre para la carpeta y para el .zip, como en Linux.
  const name = `${configuration.productName} ${version} portable`
  const folder = join(outDir, name)
  const zip = join(outDir, `${name}.zip`)
  rmSync(zip, { force: true })
  rmSync(folder, { recursive: true, force: true })

  // ZipFile toma el nombre de la carpeta raiz de la propia carpeta: se
  // renombra un momento en vez de copiar cientos de megas.
  renameSync(unpacked, folder)
  try {
    // Las rutas viajan por el entorno y no dentro del comando, para no tener
    // que escapar espacios ni comillas en PowerShell.
    execFileSync(
      'powershell',
      [
        '-NoProfile',
        '-NonInteractive',
        '-Command',
        'Add-Type -AssemblyName System.IO.Compression.FileSystem; ' +
          '[IO.Compression.ZipFile]::CreateFromDirectory(' +
          '$env:COTEJO_ZIP_FROM, $env:COTEJO_ZIP_TO, ' +
          '[IO.Compression.CompressionLevel]::Optimal, $true)'
      ],
      { env: { ...process.env, COTEJO_ZIP_FROM: folder, COTEJO_ZIP_TO: zip }, stdio: 'inherit' }
    )
  } finally {
    renameSync(folder, unpacked)
  }

  console.log(`  • portable  file=${zip}`)
  return [zip]
}
