// Rasteriza build/icon.svg a build/icon.png.
//
// electron-builder genera por su cuenta el .ico multi-resolucion que necesita
// Windows, pero solo si le damos un PNG de 256 px o mas. El SVG es la fuente de
// verdad del icono; este script existe para que nadie tenga que abrir un editor
// de imagenes para regenerarlo.

import { readFile, writeFile, mkdir } from 'node:fs/promises'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import sharp from 'sharp'

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const source = resolve(root, 'build/icon.svg')
const target = resolve(root, 'build/icon.png')

const SIZE = 512

const svg = await readFile(source)
const png = await sharp(svg, { density: 384 }).resize(SIZE, SIZE).png().toBuffer()

await mkdir(dirname(target), { recursive: true })
await writeFile(target, png)

console.log(`icono generado: build/icon.png (${SIZE}x${SIZE}, ${(png.length / 1024).toFixed(1)} kB)`)
