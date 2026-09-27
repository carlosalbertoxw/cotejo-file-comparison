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

Node según [.nvmrc](.nvmrc) (hoy la 22) y npm:

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
- **Nada de rutas nuevas al disco sin validar.** Un canal IPC nuevo pasa por
  `src/main/ipc/validate.ts`, y una operación sobre una carpeta, por `safeJoin`. Ver
  [SECURITY.md](SECURITY.md).
- **Textos en los cuatro idiomas.** Los catálogos están en `src/renderer/i18n/locales/`, con
  `es.json` como fuente de verdad, y un test exige que tengan las mismas claves. Cada frase va
  entera en su clave: juntar trozos funciona en español y se rompe en otro idioma.
- **Lo que note el usuario va en `changelog/proxima.md`,** escrito para quien descarga la
  aplicación, no para quien lee el código. Las reglas están en
  [changelog/README.md](changelog/README.md).
- **La documentación, en el mismo cambio.** Si cambia un comando, una ruta o un comportamiento
  descrito en el README, se actualiza en el mismo PR.

## Estilo

- TypeScript estricto, comillas simples, sin punto y coma, dos espacios. `.editorconfig` se
  encarga de lo básico.
- Los comentarios explican **por qué**, no qué: la decisión, la alternativa descartada, el caso
  raro que obliga a hacerlo así. Si el código se entiende solo, no necesita comentario.
- Los mensajes de commit, en español y en imperativo («Guardar sin perder los permisos»). El
  cuerpo cuenta el motivo del cambio.

## Licencia

Al contribuir aceptas que tu aportación se publique bajo la [licencia MIT](LICENSE) del proyecto.
