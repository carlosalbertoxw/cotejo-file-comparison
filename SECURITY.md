# Seguridad

> **English:** please report vulnerabilities privately through
> [GitHub's private reporting](https://github.com/carlosalbertoxw/cotejo-file-comparison/security/advisories/new),
> not in a public issue. Reports in English are welcome.

## Cómo reportar una vulnerabilidad

**No abras un issue público.** Usa el
[reporte privado de GitHub](https://github.com/carlosalbertoxw/cotejo-file-comparison/security/advisories/new):
solo lo ve el mantenedor, y la corrección se puede preparar antes de que el fallo sea conocido.

Ayuda mucho incluir la versión de Cotejo (sale en «Acerca de»), el sistema operativo, los pasos
para reproducirlo y qué consigue quien lo aprovecha.

Cotejo es un proyecto personal: no hay plazos garantizados ni recompensas. Lo razonable es una
primera respuesta en una semana y, si se confirma, una versión corregida lo antes posible. Quien
reporta aparece en las notas de esa versión, salvo que prefiera no hacerlo.

## Versiones con soporte

Solo la última versión publicada. Las correcciones salen como versión nueva y la aplicación avisa
de ella; no se publican parches para versiones anteriores.

## Qué se protege y de quién

Este es el modelo de amenazas con el que se ha diseñado Cotejo. Sirve para decidir si algo es una
vulnerabilidad y para revisar los cambios que tocan las fronteras de abajo.

### Lo que hay que proteger

- **Los archivos del usuario.** Cotejo los lee, los escribe, los copia, los mueve y los manda a la
  papelera. Lo peor que puede pasar es perder o corromper uno sin que el usuario lo pidiera.
- **El equipo del usuario.** El proceso principal tiene todos los permisos del usuario; nada que
  venga de fuera debería poder ejecutar código con ellos.
- **Lo que se descarga.** Los instalables no van firmados, así que su integridad depende de la
  cadena que los construye y publica.

### Fronteras de confianza

```
 archivos del usuario ──► renderer (sandbox) ──► preload ──► IPC ──► proceso principal ──► disco
                             │                                            │
                     solo contenido propio                   api.github.com (una vez al día)
```

1. **Renderer → proceso principal.** El renderer corre con `sandbox`, `contextIsolation` y sin
   Node. Solo ve las funciones de `window.api` (`src/preload/index.ts`). El proceso principal
   valida la forma de cada mensaje (`src/main/ipc/validate.ts`) y confina las operaciones de
   carpetas a sus raíces (`safeJoin` en `src/main/services/fileOpsService.ts`).
2. **Contenido de los archivos → renderer.** El texto de un archivo se muestra como texto, nunca
   como HTML. La CSP (`src/renderer/index.html`) solo permite scripts del propio paquete, y la
   ventana no navega a ningún sitio ni abre ventanas: los enlaces van al navegador del sistema, y
   solo si son `https:`.
3. **Red.** La única conexión es la consulta diaria a la API de releases de GitHub, a una URL fija.
   La respuesta solo se usa para comparar números de versión.
4. **Ejecutable.** Los fuses de Electron (`electron-builder.yml`) impiden usar el binario como
   intérprete de Node o inyectarle código por variables de entorno. En Windows y macOS, además, se
   niega a arrancar si alguien modifica su `app.asar`.
5. **Cadena de publicación.** Los jobs que instalan dependencias solo tienen permisos de lectura.
   Crear la release, subir los archivos y firmar su procedencia lo hace un job aparte que no
   ejecuta código del proyecto. Las acciones de GitHub van fijadas por SHA. Cada release lleva
   `SHA256SUMS.txt` y una atestación que se comprueba con `gh attestation verify`.

### Riesgo asumido

**El puente IPC confía en el renderer para elegir rutas.** `readTextFile`, `writeTextFile` y
`statPath` aceptan cualquier ruta absoluta, y las operaciones de carpetas cualquier par de raíces.
No es un descuido: las rutas llegan de sitios que solo existen en el renderer —la barra de rutas
escrita a mano, el historial, las pestañas restauradas y lo que se arrastra a la ventana—, y el
proceso principal no puede distinguirlas de unas inventadas. Una lista de rutas concedidas o se
salta en dos pasos (leer primero, escribir después) o rompe esas funciones.

La defensa está, por tanto, en que el renderer no se pueda comprometer: la frontera 2 de arriba.
Cualquier forma de ejecutar código en el renderer —HTML de un archivo que se interprete, una
navegación que se escape, una dependencia del bundle comprometida— es una vulnerabilidad grave y
se trata como tal.

### Fuera de alcance

- Lo que requiere que el atacante ya pueda ejecutar código como el usuario en ese equipo.
- Los avisos de SmartScreen y de Gatekeeper: salen porque los instalables no van firmados, y está
  documentado en el README.
- Comparar o editar archivos que el propio usuario eligió, incluidos los de sistema, si tiene
  permiso para escribirlos.
