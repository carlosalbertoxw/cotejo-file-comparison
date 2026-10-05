# Contribuir a Cotejo

Gracias por echar una mano. Esta guía recoge lo que un cambio necesita para entrar; el
[README](README.md) explica cómo está hecho el proyecto por dentro.

## Antes de empezar

- **Un fallo:** abre un [issue](https://github.com/carlosalbertoxw/cotejo-file-comparison/issues)
  con la versión (sale en «Acerca de»), el sistema y los pasos para reproducirlo.
- **Una vulnerabilidad:** no abras un issue; sigue [SECURITY.md](SECURITY.md).
- **Algo nuevo, o un cambio de comportamiento:** abre antes un issue para hablarlo. Cotejo hace
  pocas cosas a propósito, y es mejor saber si encaja antes de escribir el código.

## Preparar el entorno

Node según [.nvmrc](.nvmrc) (hoy la 22) y npm 11.16 o posterior, que es el que aplica la lista de
scripts de instalación permitidos (`allowScripts` en `package.json`; el porqué está en la sección
Desarrollo del README). Si tu npm es anterior:

```bash
npx --yes npm@11.16.0 ci
```

Y si no:

```bash
npm ci
```

```bash
npm run dev
```

## Qué tiene que cumplir un pull request

El CI lo comprueba todo en Linux y en Windows, pero es más rápido verlo antes en local:

```bash
npm run lint
```

```bash
npm run typecheck
```

```bash
npm test
```

```bash
npm run build && npm run test:e2e
```

Además:

- **Una cosa por pull request.** Un arreglo y una refactorización son dos PR.
- **Pruebas para lo que cambia.** La lógica pura y los servicios que tocan disco se prueban en
  `test/`; los flujos que cruzan el puente IPC, en `e2e/`.
- **Nada de rutas nuevas al disco sin validar.** Un canal IPC nuevo se registra con `handle`
  (`src/main/ipc/handle.ts`), que rechaza a cualquier remitente que no sea la propia página, y
  pasa sus argumentos por `src/main/ipc/validate.ts`; una operación sobre una carpeta, por
  `safeJoin`. Ver
  [SECURITY.md](SECURITY.md).
- **Textos en los cuatro idiomas.** Los catálogos están en `src/renderer/i18n/locales/`, con
  `es.json` como fuente de verdad, y un test exige que tengan las mismas claves. Cada frase va
  entera en su clave: juntar trozos funciona en español y se rompe en otro idioma.
- **Lo que note el usuario va en `changelog/proxima.md`,** escrito para quien descarga la
  aplicación, no para quien lee el código. Las reglas están en
  [changelog/README.md](changelog/README.md).
- **Una dependencia nueva con script de instalación se revisa antes de aprobarla.** `npm ci`
  falla hasta que se aprueba con `npm approve-scripts <paquete>` o se deniega con
  `npm deny-scripts <paquete>`. Lo que hace el script va en el PR.
- **Las decisiones que cruzan todo el proyecto, en `docs/adr/`.** Cambiar una de las que ya hay
  —o tomar otra de ese calibre— es un registro nuevo, no una edición del viejo.
- **La documentación, en el mismo cambio.** Si cambia un comando, una ruta o un comportamiento
  descrito en el README, se actualiza en el mismo PR.

## Estilo

- TypeScript estricto, comillas simples, sin punto y coma, dos espacios y 100 columnas.
  `.editorconfig` se encarga de lo básico, y `npm run lint` comprueba las comillas, el punto y
  coma, las comas finales y el ancho de línea.
- Los comentarios explican **por qué**, no qué: la decisión, la alternativa descartada, el caso
  raro que obliga a hacerlo así. Si el código se entiende solo, no necesita comentario.
- Los mensajes de commit, en español y en imperativo («Guardar sin perder los permisos»). El
  cuerpo cuenta el motivo del cambio.

## Herramientas de IA

Se pueden usar, y en este proyecto se usan: buena parte de los commits llevan un trailer
`Co-Authored-By` de un asistente. Lo que no cambia es quién responde del cambio: quien abre el PR
lo ha leído entero, lo entiende, lo ha probado y puede contribuirlo bajo la licencia del proyecto,
igual que si lo hubiera escrito a mano. Si un asistente ha escrito una parte importante, dilo en el
PR o con el trailer.

## Licencia

Al contribuir aceptas que tu aportación se publique bajo la [licencia MIT](LICENSE) del proyecto.
