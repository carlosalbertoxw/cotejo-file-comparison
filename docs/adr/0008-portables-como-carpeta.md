# 0008. Las versiones sin instalar son una carpeta, no un ejecutable que se descomprime

- **Estado:** Aceptada
- **Fecha:** 2026-10-24

## Contexto

Hasta la 0.8.0 la versión sin instalar era el target `portable` de electron-builder en Windows, un
`.exe` que en cada arranque se descomprimía entero en una carpeta temporal, y un AppImage en Linux,
que se monta o se descomprime cada vez que se abre. Las dos tardaban más en arrancar que la
instalada y dejaban restos si se cerraban mal, y «Acerca de» tenía que explicar esa carpeta
temporal.

## Decisión

- La versión sin instalar es la carpeta de la aplicación, ya lista, comprimida: «Cotejo X.Y.Z
  portable.zip» en Windows y «Cotejo X.Y.Z portable.tar.gz» en Linux. Se descomprime una vez y se
  abre `Cotejo.exe` o `cotejo`. Los dos llevan dentro una carpeta con su mismo nombre.
- El `.zip` no sale del target `zip` de electron-builder, que deja los archivos sueltos en la raíz
  para todo lo que no es macOS: lo arma `scripts/portable-zip.mjs`, un hook
  `afterAllArtifactBuild`, a partir de `win-unpacked`, con el `ZipFile` de .NET que trae Windows.
  El `.tar.gz` sí sale del target de electron-builder, que ya lo arma con la carpeta.
- Los datos (preferencias, historial) siguen en la carpeta de datos de siempre, no junto al
  programa.

## Alternativas descartadas

- **El target `zip` tal cual.** «Extraer aquí» de 7-Zip o WinRAR desparrama una veintena de
  archivos donde caiga.
- **Comprimir con el 7za interno de electron-builder.** Depende de rutas privadas de
  `app-builder-lib` que cambian entre versiones.
- **Guardar los datos junto al programa** (portable de verdad). Duplicaría la configuración entre la
  versión instalada y la sin instalar, y obligaría a decidir qué pasa al actualizar descomprimiendo
  otra carpeta.

## Consecuencias

- Arranca igual de rápido que la instalada, y no deja nada en las carpetas temporales.
- El empaquetado de Windows depende de PowerShell, que solo es un problema si algún día se construye
  el instalador fuera de Windows.
- El `.tar.gz` construido desde Windows sale sin permiso de ejecución porque NTFS no lo guarda; el
  release lo construye en Ubuntu.
- En Ubuntu 24.04 la versión sin instalar puede chocar con la restricción de AppArmor al sandbox de
  Chromium, igual que el AppImage antes: este cambio ni lo empeora ni lo arregla.
- El sitio clasifica las descargas por el nombre, y sigue reconociendo el `.exe` y el AppImage
  mientras la última release publicada sea una de antes de este cambio.

## Dónde se aplica

- `electron-builder.yml` (`afterAllArtifactBuild`, targets de `win` y `linux`).
- `scripts/portable-zip.mjs`.
- `.github/workflows/release.yml` (qué archivos sube cada plataforma).
- `sitio/src/lib/release.ts` (`classifyAsset`).
- `src/main/ipc/app.ts` (`programLocation`, la fila «Programa» de «Acerca de»).
