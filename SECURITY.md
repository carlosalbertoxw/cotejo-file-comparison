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

## Si una release sale comprometida

Una release rota se retira como cuenta el README («Retirar una release defectuosa»). Este es el caso
peor: un instalable que alguien manipuló, porque se hizo con la cuenta de GitHub, con un token o
con el propio workflow. Los instalables no van firmados, así que la cuenta y la cadena de
publicación son la única garantía, y la primera hora no se puede improvisar.

1. **Que deje de descargarse.** `gh release edit vX.Y.Z --prerelease` y regenerar el sitio con
   `gh workflow run pages.yml --ref main`, como en una retirada normal. Si hay duda sobre la
   integridad de la propia cuenta, borrar además los archivos de esa release: aquí la regla de no
   borrar nada no vale, porque lo que hay publicado es justo lo que no tiene que llegar a nadie.
2. **Cortar el acceso.** Cerrar todas las sesiones de GitHub, cambiar la contraseña, revisar los
   métodos de MFA, y revocar los tokens personales, las claves SSH, las deploy keys y las
   aplicaciones OAuth que no se reconozcan. El registro de seguridad de la cuenta
   (`Settings → Security log`) dice qué se hizo y desde dónde.
3. **Medir el alcance.** Revisar los últimos commits, los tags y cualquier cambio en `.github/`;
   comprobar qué ejecución del workflow produjo cada archivo. `gh attestation verify` delata un
   archivo que no salió del workflow, pero no uno que salió de un workflow manipulado: si se tocó
   `.github/`, las atestaciones de esas ejecuciones no prueban nada.
4. **Avisar.** Un GitHub Security Advisory en el repositorio con las versiones y los archivos
   afectados, sus sumas SHA-256 y qué hacer si se instalaron. El mismo aviso, en la release
   retirada y en el sitio. Quien la tenga instalada no recibe nada de la propia aplicación: su
   versión es más nueva que la que pasa a figurar como última.
5. **Publicar una versión limpia** con número superior, desde un commit revisado y con la cuenta ya
   asegurada. Nunca se reutiliza el número de la comprometida.

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
   solo atiende mensajes del marco principal de su propia página (`src/main/ipc/handle.ts`),
   valida la forma de cada uno (`src/main/ipc/validate.ts`) y confina las operaciones de
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
   ejecuta código del proyecto. Las acciones de GitHub van fijadas por SHA, y ninguna dependencia
   ejecuta scripts al instalarse salvo las aprobadas en `allowScripts`. Cada release lleva
   `SHA256SUMS.txt`, un SBOM CycloneDX con las versiones exactas de lo que va dentro, y una
   atestación que cubre a ambos y se comprueba con `gh attestation verify`.

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
