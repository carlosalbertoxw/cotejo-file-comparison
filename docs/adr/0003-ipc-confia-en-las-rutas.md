# 0003. El puente IPC acepta cualquier ruta que mande el renderer

- **Estado:** Aceptada
- **Fecha:** 2026-09-27

## Contexto

El renderer no tiene acceso al disco: lo pide por IPC al proceso principal (`readTextFile`,
`writeTextFile`, `statPath`, las operaciones de carpetas). Lo natural sería que el proceso
principal solo aceptara rutas que él mismo hubiera concedido, por ejemplo las elegidas en un
diálogo nativo.

Pero las rutas nacen en sitios que solo existen en el renderer: la barra de rutas escrita a mano,
el historial, las pestañas restauradas de la sesión anterior y lo que se arrastra a la ventana.

## Decisión

El proceso principal acepta cualquier ruta absoluta que tenga buena forma. La defensa no está en
filtrar rutas, sino en que el renderer no se pueda comprometer:

- `sandbox`, `contextIsolation` y sin Node en el renderer; solo ve `window.api`.
- Cada canal comprueba que lo llama el marco principal de la propia página (`handle`).
- Cada argumento se valida en forma y tamaño (`validate.ts`), y las rutas tienen que ser absolutas.
- Las operaciones de carpetas no salen de sus dos raíces (`safeJoin`).
- Sin navegación, sin ventanas nuevas y con una CSP que solo deja scripts propios ([0001](0001-renderer-desde-file.md)).

Cualquier forma de ejecutar código en el renderer se trata como vulnerabilidad grave.

## Alternativas descartadas

- **Lista de rutas concedidas.** O se salta en dos pasos (leer una ruta concedida para ver su
  contenido y escribir después en otra), o rompe la barra de rutas, el historial y las sesiones,
  que son la mitad de la aplicación.
- **Pedir confirmación nativa en cada escritura.** Convierte cada guardado en un diálogo.

## Consecuencias

- Está escrito como riesgo asumido en SECURITY.md, que es el criterio para valorar reportes.
- Un canal IPC nuevo tiene que registrarse con `handle` y validar sus argumentos (CONTRIBUTING).

## Dónde se aplica

- `src/main/ipc/handle.ts`, `src/main/ipc/sender.ts`, `src/main/ipc/validate.ts`.
- `safeJoin` en `src/main/services/fileOpsService.ts`.
- `src/preload/index.ts`.
