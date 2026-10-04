# 0001. El renderer se sirve desde `file://` con privilegios, no por un protocolo propio

- **Estado:** Aceptada
- **Fecha:** 2026-07-31

## Contexto

La interfaz es un bundle de Vite con scripts de módulo y dos Web Workers de módulo: el del diff y
el de la búsqueda. Electron puede cargarla desde `file://` o registrar un esquema propio
(`app://`) y servirla por ahí.

Desde `file://`, Chromium solo carga módulos y Workers de módulo si el esquema conserva los
privilegios que Electron le da por defecto. El fuse `grantFileProtocolExtraPrivileges` los quita, y
es uno de los que se recomienda apagar para endurecer el ejecutable.

## Decisión

El renderer se carga desde `file://` y el fuse `grantFileProtocolExtraPrivileges` se deja como
viene. El resto de fuses se cierran.

Lo que compensa ese privilegio:

- La ventana no navega a ningún sitio (`will-navigate`) ni abre ventanas (`setWindowOpenHandler`).
- El proceso principal solo atiende IPC del marco principal cuya ruta `file:` es exactamente la de
  `index.html` (`isAppUrl`), no la de cualquier otro HTML del disco, aunque su origen sea el mismo.
- La CSP solo deja ejecutar scripts del propio paquete.

## Alternativas descartadas

- **Protocolo propio (`app://`) y fuse apagado.** Es lo más cerrado, pero obliga a reimplementar
  la entrega de archivos, los tipos MIME y el soporte de módulos y Workers en un manejador propio.
  Ese manejador pasaría a ser código de seguridad nuevo, sin pruebas, en el proceso principal.
- **Servidor HTTP local.** Abre un puerto que cualquier proceso del equipo puede consultar.

## Consecuencias

- Un HTML del disco que llegara a cargarse en la ventana tendría los mismos privilegios de
  esquema. Por eso la navegación está cerrada y la comprobación del remitente compara la ruta, no
  solo el origen.
- Si algún día se sirve por protocolo propio, este registro se sustituye y el fuse se apaga.

## Dónde se aplica

- `electron-builder.yml`: sección `electronFuses` y su comentario.
- `src/main/rendererUrl.ts`, `src/main/index.ts` (`will-navigate`, `setWindowOpenHandler`).
- `src/main/ipc/sender.ts` (`isAppUrl`) y `src/main/ipc/handle.ts`.
- `src/renderer/index.html` (CSP).
