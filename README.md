# Cotejo

Pon dos cosas una al lado de la otra y mira en qué se diferencian.

Cotejo es una aplicación de escritorio para **comparar archivos de texto** y **carpetas completas**.
Muestra los dos lados enfrentados línea a línea, deja editarlos, copiar bloques de uno a otro, y
operar sobre los archivos desde la vista de carpetas.

Electron + React + TypeScript. El motor de comparación, la alineación y todo el aspecto visual son
propios; CodeMirror 6 se usa solo como área de texto editable dentro de cada panel.

## Novedades de la 0.7.0

Cerrar una pestaña, salir o cambiar de archivo con **cambios sin guardar pregunta antes** en vez de
perderlos. Lo que se sobrescribe al copiar o mover **va a la papelera**, y el diálogo dice archivo
por archivo qué se va a pisar, incluidos los que la tabla no muestra. Los fallos quedan anotados
en un **registro de errores** local para poder informar de ellos. Pasa a Electron 44, que **deja
fuera macOS 12**: en un Mac hace falta macOS 13 Ventura o posterior. Están los detalles en
[las notas de la versión](changelog/v0.7.0.md).

## Instalación

Las descargas están en
**[carlosalbertoxw.com/cotejo-file-comparison](https://carlosalbertoxw.com/cotejo-file-comparison/#downloads)**,
que señala el archivo que le toca a cada sistema y está en los cuatro idiomas de la aplicación. Los
archivos se sirven desde las releases de este repositorio; la página es por dónde se llega a ellos.

Cada plataforma tiene una versión que instala y otra que se ejecuta sin instalar. Todas llevan la
misma aplicación dentro.

| Sistema | Instala | Sin instalar |
| --- | --- | --- |
| Windows | `Cotejo.Setup.<versión>.exe` | `Cotejo.<versión>.portable.exe` |
| Linux | `.deb` (Debian, Ubuntu) o `.rpm` (Fedora, RHEL) | `Cotejo.<versión>.portable.AppImage` |
| macOS | `Cotejo.<versión>.arm64.dmg` (Apple Silicon) o `x64.dmg` (Intel) | `.zip` con la app dentro |

Los nombres llevan puntos donde electron-builder pone espacios: GitHub los cambia al publicarlos, y
así es como se descargan.

Al AppImage hay que darle permiso de ejecución la primera vez, con `chmod +x`, y ya se abre con
doble clic.

En macOS la aplicación **no está firmada**, porque firmarla exige una cuenta de pago de Apple.
Gatekeeper la bloqueará la primera vez con un aviso que parece de archivo dañado; se abre con clic
derecho sobre la app → Abrir, y a partir de ahí funciona con normalidad. Los atajos usan ⌘ en vez
de Ctrl, como cualquier otra aplicación de macOS. Hace falta macOS 13 Ventura o posterior.

### Comprobar la descarga

Que no vayan firmados no quiere decir que no se puedan comprobar. Cada release lleva un
`SHA256SUMS.txt` con la huella de cada archivo, y una atestación de GitHub que certifica que
salieron del workflow de release de este repositorio y de qué commit. Lleva también un
`Cotejo-X.Y.Z-sbom.cdx.json`, el inventario en formato CycloneDX de las versiones exactas de
Electron y de cada paquete que entra en la aplicación, para saber si un aviso de seguridad sobre
alguno de ellos afecta a la versión que tienes.

La comprobación completa, con la [CLI de GitHub](https://cli.github.com/):

```bash
gh attestation verify Cotejo.Setup.0.7.0.exe --repo carlosalbertoxw/cotejo-file-comparison
```

Solo la huella, desde la carpeta de la descarga. En Linux:

```bash
sha256sum -c SHA256SUMS.txt --ignore-missing
```

En macOS, filtrando la línea del archivo descargado:

```bash
grep arm64.dmg SHA256SUMS.txt | shasum -a 256 -c
```

Y en Windows, comparando a ojo con la línea del archivo en `SHA256SUMS.txt`:

```powershell
Get-FileHash Cotejo.Setup.0.7.0.exe
```

## Uso

Para trabajar sobre el código:

```bash
npm install
```

```bash
npm run dev
```

También puedes abrir una comparación directamente:

```bash
npm run dev -- ruta/izquierda ruta/derecha
```

Dos carpetas abren una comparación de carpetas; cualquier otra combinación, una de texto. Arrastrar
uno o dos archivos o carpetas sobre la ventana hace lo mismo, igual que abrirlos con Cotejo desde el
explorador de archivos.

**Solo hay una instancia.** Abrir algo con Cotejo ya en marcha añade una pestaña a la ventana que
ya existe y la trae al frente, en vez de levantar otra aplicación con su propia sesión.

La pantalla de bienvenida recuerda las **últimas comparaciones** que se llegaron a abrir, con sus
rutas, para repetirlas de un clic. Se guardan solo las rutas, así que al abrir una se relee del
disco. Cada entrada se puede quitar por separado, o borrar la lista entera. Repetir una comparación
que ya está abierta salta a su pestaña en vez de duplicarla.

## Idiomas

La interfaz está en **español, inglés, francés y portugués de Brasil**. Al primer arranque Cotejo
toma el idioma del sistema, y si no es ninguno de esos cuatro se queda en español. El selector está
en la barra de pestañas y en la pantalla de bienvenida; lo que elijas se recuerda.

Las fechas y los tamaños siguen al idioma activo, así que el separador decimal y el orden de la
fecha son los que espera cada región.

## Cómo leerlo

Cotejo usa **cálido contra frío** en vez de la pareja rojo/verde habitual: se distingue mejor con
los daltonismos más comunes, y deja el rojo libre para significar una sola cosa, "esto destruye
algo".

| Color | Significa |
| --- | --- |
| Ámbar | La línea existe en los dos lados pero cambió. Dentro, la palabra concreta va resaltada. |
| Verde azulado | La línea solo existe en un lado. El otro lado muestra un hueco rayado. |
| Gris atenuado | Difieren solo en algo que pediste ignorar (espacios, mayúsculas, líneas en blanco). |
| Rojo | Únicamente en avisos de acciones destructivas. Nunca es un tipo de diferencia. |
| Violeta | Lo que encontró la búsqueda. Tampoco es un tipo de diferencia: va encima del color de la línea, y la coincidencia actual lleva contorno. |

Todas las combinaciones de texto sobre fondo cumplen un contraste WCAG de 4.5:1 (3:1 en los
elementos secundarios como la numeración de líneas), en tema claro y oscuro.

## Comparar texto

- No hacen falta archivos: se compara lo que haya en los dos paneles, así que puedes escribir o
  pegar dos frases y ver en qué se diferencian. También vale mezclar, con un archivo a un lado y
  texto pegado al otro.
- Las líneas emparejadas quedan enfrentadas, con huecos donde un lado no tiene contenido. Los dos
  paneles miden exactamente lo mismo, así que nunca se desincronizan al hacer scroll.
- `F7` / `Shift+F7` saltan a la diferencia siguiente / anterior. El mapa de la derecha resume el
  archivo entero y permite saltar con un clic.
- El botón **Buscar** de la barra y `Ctrl+F` (`⌘F` en macOS) abren una **caja de búsqueda** en el
  panel donde estabas, como la de «buscar en la página» del navegador: resalta todas las
  coincidencias de ese lado y va contando en cuál estás. `Intro` / `Shift+Intro` —o `F3` / `Shift+F3` sin volver a la caja— saltan entre ellas,
  y `Esc` la cierra. Cada panel tiene la suya, y se puede distinguir mayúsculas (`Aa`), buscar solo
  palabras completas (`|ab|`) o escribir una expresión regular (`.*`). Si al abrirla había texto
  seleccionado dentro de una línea, se busca eso.
- Las flechas ◀ ▶ de la franja central copian un bloque al otro lado. Se aplican como una edición
  normal, así que `Ctrl+Z` las deshace.
- Para transferir menos que un bloque, selecciona el texto y usa **Selección ▶** / **◀ Selección**:
  van las líneas que toque la selección, sobre las que tienen enfrente en el otro lado. Mientras hay
  selección manda su color por encima del color de la diferencia, así que lo resaltado es
  exactamente lo que se va a transferir.
- Cada ruta tiene su propio botón **Guardar**, activo solo si ese lado tiene cambios, para guardar
  uno sin tocar el otro. `Ctrl+S` (`⌘S` en macOS) guarda los dos de una vez. Se guarda siempre
  **preservando los finales de línea y el BOM originales**.
- Opciones: ignorar espacios, mayúsculas o líneas en blanco, y ancho de tabulación.

### Al cerrar o cambiar de archivo

**Cerrar una pestaña con cambios sin guardar pregunta antes**, tanto con su ✕ como con `Ctrl+W`
(`⌘W` en macOS): se puede guardar y cerrar, cerrar sin guardar o seguir donde estabas. Cuenta
también el texto escrito o pegado en un panel sin archivo, que no tiene dónde guardarse y se
perdería igual. Cerrar la ventana o salir de la aplicación con trabajo pendiente pregunta lo mismo.

**Cargar otro archivo en un panel con cambios también pregunta**, igual que cerrar: confirmar otra
ruta, elegir otro archivo con «…» o pulsar **Recargar**. La ruta escrita a mano no se carga hasta
pulsar `Intro` o salir del campo, y `Esc` deshace lo escrito; en la vista de carpetas, la
comparación tampoco empieza hasta entonces.

### Al guardar

- **Si el archivo cambió en el disco** desde que se abrió, no se escribe nada: Cotejo lo dice y
  ofrece guardar de todas formas o recargar. Guardar a ciegas borraría el trabajo de quien lo
  tocara mientras tanto.
- La escritura pasa por un archivo temporal y un cambio de nombre encima, así que **un corte a
  mitad no deja el archivo a medias**: o está el contenido viejo, o está el nuevo. Los enlaces
  simbólicos se escriben en su sitio, para no sustituirlos por un archivo normal.
- **Un archivo que no sea UTF-8 válido se abre en solo lectura.** Se puede comparar, pero no
  editar: al decodificarlo se pierden los bytes que no encajan, y guardarlo escribiría rombos de
  sustitución donde había eñes. Es el caso de los `.txt` heredados en Windows-1252.
- Por encima de **12 MB** un archivo no se abre. El texto se duplica varias veces por el camino
  —buffer, cadena, copia sin CRLF, paso al worker de comparación—, así que el límite viejo de 64 MB
  prometía algo que la aplicación no aguantaba.

## Comparar carpetas

Tres modos, de más rápido a más fiable:

| Modo | Qué compara | Cuándo usarlo |
| --- | --- | --- |
| Rápido | Tamaño + fecha (2 s de tolerancia) | Uso diario |
| Solo tamaño | Solo el tamaño | Barridos muy grandes |
| Contenido | Hash sha256 en streaming | Cuando no te puedes fiar de la fecha |

Los dos árboles se muestran enfrentados, cada uno con sus nombres, tamaños y fechas, y alineados
fila a fila. Donde una entrada existe solo en un lado, el otro deja el mismo hueco rayado que una
línea huérfana en el comparador de texto, así que la estructura de ambas carpetas se lee de un
vistazo sin perder la correspondencia.

Doble clic sobre un archivo distinto lo abre en una pestaña de comparación de texto. Si esa
comparación ya está abierta, salta a su pestaña en vez de abrir otra igual.

La tabla se maneja **también con el teclado**: flechas arriba y abajo para moverse, derecha e
izquierda para abrir y cerrar carpetas, `Inicio` y `Fin` para los extremos, `AvPág` y `RePág` para
saltar de pantalla, `Espacio` para añadir o quitar de la selección y `Entrar` para abrir la
comparación de esa fila.

**Los borrados van a la papelera del sistema** —la de Windows, macOS o el escritorio de Linux que
toque—, y **lo que se sobrescribe, también**: antes de copiar o mover encima de un archivo, el que
había va a la papelera. Toda operación destructiva o que sobrescriba pide confirmación mostrando
antes el número exacto de archivos, los bytes y la lista, archivo por archivo, de lo que se va a
sobrescribir; si se copia una carpeta que existe en los dos lados, cada archivo de dentro que
coincida, no solo el nombre de la carpeta.

Una carpeta viaja entera, con lo que la tabla no enseña: los archivos ocultos, los excluidos por
los filtros y los enlaces simbólicos. Cuando hay algo así dentro de lo seleccionado, el diálogo lo
avisa y lo lista antes de confirmar.

## Acerca de y actualizaciones

El botón **Acerca de**, en la barra de pestañas y en la pantalla de bienvenida, abre una ficha con
la versión instalada, la licencia, las versiones de Electron, Chromium y Node, y enlaces al
[sitio del proyecto](https://carlosalbertoxw.com/cotejo-file-comparison/), al código fuente y a los
problemas. Los enlaces abren el navegador del sistema, nunca dentro de la ventana, y el del sitio
va al idioma que tenga puesto la aplicación.

La misma ficha dice **dónde deja archivos Cotejo**, con la ruta real de ese equipo:

| Qué | Dónde |
| --- | --- |
| Preferencias, pestañas abiertas, historial, última comprobación de versiones y caché de Chromium | La carpeta de datos: `%APPDATA%\cotejo` en Windows, `~/Library/Application Support/cotejo` en macOS, `~/.config/cotejo` en Linux. Tiene botón para abrirla. |
| La copia descomprimida del `.exe` portable o del AppImage | Una carpeta temporal del sistema, que desaparece al cerrar. Solo sale si se está usando una de las versiones sin instalar. |
| El temporal de cada guardado | Junto al propio archivo, como `.<código>.cotejo-tmp` (doce caracteres hexadecimales al azar), hasta que lo sustituye. Si aparece uno suelto es que el guardado se cortó a mitad, y se puede borrar. |
| El registro de errores, `cotejo.log` | `logs` dentro de la carpeta de datos en Windows y Linux, `~/Library/Logs/cotejo` en macOS. Tiene botón para abrirla. |

Borrar la carpeta de datos devuelve Cotejo al estado del primer arranque. Fuera de esas cuatro rutas
la aplicación no guarda nada propio.

El registro de errores solo existe si algo ha fallado: una copia, un movimiento o un borrado que no
se completó, un guardado que no llegó al disco, o la ventana que se cerró de golpe. Cada línea dice
cuándo, qué operación, sobre qué ruta y con qué error del sistema; nunca el contenido de los
archivos. Es uno por sesión: el primer error de cada arranque pasa el anterior a `cotejo.old.log` y
empieza otro, y un arranque sin errores no toca nada, así que lo de la última vez que algo falló
sigue ahí después de reiniciar. Si el anterior no se puede renombrar —porque otro programa lo tiene
bloqueado, por ejemplo—, la sesión lo vacía y empieza de cero. Cada sesión escribe como mucho 1 MB,
así que entre los dos nunca pasan de 2 MB. No sale del equipo: es para adjuntarlo, si se quiere, al
informar de un problema.

Una vez al día Cotejo pregunta a GitHub cuál es la última release publicada. Si hay una más nueva
que la instalada, aparece una franja sobre la barra de pestañas con un enlace a la
[página de descargas](https://carlosalbertoxw.com/cotejo-file-comparison/#downloads), que explica
qué archivo le toca a cada sistema. El aviso se puede cerrar y no vuelve para esa misma versión,
pero sí para la siguiente. Desde «Acerca de» también se puede comprobar a mano en cualquier
momento, y ahí mismo se puede apagar la comprobación diaria: es la única conexión que hace Cotejo, y
sin ella no sale nada del equipo salvo cuando se pulsa el botón.

Cotejo **no se actualiza solo**: descargar y sustituir el ejecutable por su cuenta exige una
aplicación firmada, y sin certificado eso no se sostiene. Solo avisa y te lleva a la descarga. Si
no hay red, el aviso se calla y lo reintenta al siguiente arranque.

## Desarrollo

Hace falta Node 22 ([.nvmrc](.nvmrc)) y **npm 11.16 o posterior**, que no es el que trae Node 22.
Es el primero que aplica el campo `allowScripts` de `package.json`: con `strict-allow-scripts` en
[.npmrc](.npmrc), una dependencia que traiga un script de instalación que nadie ha aprobado hace
fallar `npm ci` en vez de ejecutarse, que es justo por donde entra un paquete comprometido. Con un
npm anterior el campo se ignora y la instalación avisa del motor. El CI usa
`npx --yes npm@11.16.0 ci`. Si una actualización trae un script nuevo, se revisa qué hace y se
aprueba o se deniega con `npm approve-scripts <paquete>` o `npm deny-scripts <paquete>`.

```bash
npm run lint
```

```bash
npm run typecheck
```

```bash
npm test
```

Y la prueba de extremo a extremo, que arranca la aplicación construida con un perfil desechable,
abre dos archivos, copia un bloque y guarda:

```bash
npm run build && npm run test:e2e
```

Todo eso corre en cada commit y en cada pull request —en Linux y en Windows— desde
`.github/workflows/ci.yml`. El workflow de release solo se dispara
con un tag, así que sin esto un fallo de tipos no aparecía hasta el momento de publicar.

El mismo workflow pasa `npm audit` y falla si alguna dependencia tiene una vulnerabilidad conocida
de severidad alta o crítica. Aparte, `.github/workflows/codeql.yml` analiza el código y los
workflows con CodeQL en cada cambio y una vez a la semana; lo que encuentre aparece en la pestaña
Security del repositorio. Las actualizaciones de dependencias y de acciones llegan como pull
requests semanales de Dependabot.

En Linux, el CI pasa las pruebas con cobertura y deja el resumen en el log. Es un informe, no una
puerta: no hay umbral que haga fallar nada. En local, el detalle por archivo queda en
`coverage/index.html`:

```bash
npm run test:coverage
```

### Rendimiento

Cotejo está pensado para que estos casos quepan con holgura en un portátil normal:

| Caso | Hoy | Tope en las pruebas |
| --- | --- | --- |
| Fusionar el escaneo de dos carpetas con 50 000 archivos cada una | menos de 1 s | 10 s |
| Comparar dos textos de 50 000 líneas | menos de 0,5 s | 5 s |
| Abrir un archivo de texto | — | 12 MB como máximo; por encima se rechaza |

`test/performance.test.ts` comprueba los dos primeros. No mide la velocidad: está para que un cambio
que vuelva cuadrático el escaneo o el diff falle en el CI en vez de aparecer en la carpeta grande de
alguien. Los topes son más de diez veces lo que se tarda hoy, para que un runner lento no los
dispare.

### Empaquetar

Hay un script por plataforma, y los tres regeneran antes el icono y los avisos de terceros, así que
no hay que acordarse de ejecutarlos a mano:

```bash
npm run package
```

```bash
npm run package:linux
```

```bash
npm run package:mac
```

Todo aterriza en `release/`. Las carpetas `*-unpacked/` que aparecen ahí no son entregables: son la
aplicación montada que los instaladores empaquetan dentro.

**Cada script solo funciona en su propio sistema**, con una excepción y un rodeo. Windows genera
sus dos `.exe` sin más. macOS **exige un Mac**: el `.dmg` usa herramientas del propio sistema y no
hay forma de generarlo desde otro sitio, por eso existe el workflow de CI. Y Linux desde Windows
falla al crear los symlinks del AppImage, así que se construye en el contenedor oficial:

```bash
docker run --rm -v "${PWD}:/project" -v cotejo-node-modules:/project/node_modules -w /project electronuserland/builder:22-05.26@sha256:b76a82a6c6a8a1dea1abbc93e394f54316744824b64e6a50d959f1e3ba8951a9 bash -c "npx --yes npm@11.16.0 ci && npm run package:linux"
```

La imagen va fijada por etiqueta y por digest. `latest` sigue a la versión más nueva de Node —hoy la
24— y no a la del proyecto, que es la de [.nvmrc](.nvmrc). Al actualizarla, se busca la etiqueta
`22-<mes>.<año>` más reciente en Docker Hub y se sustituyen las dos partes.

El volumen sobre `node_modules` no es un detalle menor: sin él, el `npm ci` de dentro reemplazaría
en tu disco los binarios de Windows por los de Linux —`sharp` entre ellos— y `npm run dev` dejaría
de arrancar. Montándolo aparte, las dependencias del contenedor viven en su propio volumen y las
tuyas quedan intactas.

### Publicar una release

Las notas de cada versión viven en [`changelog/`](changelog/), un archivo por versión con el mismo
nombre que su tag. Son el cuerpo de la release en GitHub, así que se escriben a mano: lo que la
lista de commits no cuenta es justo lo que le interesa a quien va a descargarla.

Mientras se trabaja, lo nuevo se va anotando en `changelog/proxima.md`. Publicar es subir la
versión, renombrar ese archivo, poner al día el «Novedades de la…» de aquí arriba —que es lo único
del README que nombra una versión concreta, y por eso lo único que envejece— y empujar el tag:

```bash
git mv changelog/proxima.md changelog/v0.2.0.md
```

```bash
git tag -a v0.2.0 -m "Cotejo v0.2.0" && git push origin v0.2.0
```

Anotado, como todos los anteriores: guarda quién y cuándo lo creó, y `git describe` sin `--tags`
solo ve los anotados. Rehacerlo después de empujarlo vuelve a lanzar el workflow de release.

`.github/workflows/release.yml` construye entonces las tres plataformas en paralelo y deja una
release en borrador con todos los instalables adjuntos. Es la vía práctica para macOS, porque el
runner `macos-latest` de GitHub Actions hace de Mac sin tener que comprar uno.

Antes de empaquetar nada, el workflow comprueba dos cosas y aborta si falla alguna: que existe el
archivo de notas del tag, y que **el tag y la `version` de `package.json` coinciden**. Lo segundo
importa porque el aviso de nueva versión compara la etiqueta de la última release con la versión que
lleva dentro el ejecutable; publicar `v0.2.0` sin subir antes `package.json` dejaría a todas las
copias recién instaladas creyéndose desactualizadas.

Después cada plataforma repite lo que exige el CI, porque el tag puede salir de un commit que no
pasó por él: lint, pruebas, `npm audit` (en Linux) y, sobre lo recién empaquetado, la E2E (en Linux
y Windows). Si algo falla, esa plataforma no sube nada y la release no se crea.

### Retirar una release defectuosa

Si una versión ya publicada rompe algo serio —sobre todo si corrompe archivos—, lo primero es que
deje de ser la que se descarga y la que anuncia el aviso de actualización. Los dos leen «la última
release» de GitHub, y esa nunca es una pre-release:

```bash
gh release edit v0.6.0 --prerelease
```

El sitio no se entera solo, porque la edición no dispara su workflow. Hay que regenerarlo para que
la página de descargas vuelva a apuntar a la anterior:

```bash
gh workflow run pages.yml --ref main
```

Quien ya instaló la versión mala no recibe ningún aviso, porque la suya es más nueva que la que
ahora figura como última. Solo lo arregla una versión corregida **con número superior**. No se
reutiliza nunca el tag de la versión retirada ni se borra la release: los enlaces, las sumas y la
atestación de lo que llegó a publicarse tienen que seguir existiendo.

### Firma

Nada va firmado ahora mismo. En Windows eso significa un aviso de SmartScreen la primera vez; en
macOS, que Gatekeeper bloquee la aplicación hasta que el usuario la abra con clic derecho → Abrir.

Firmar en macOS necesita el Apple Developer Program, de pago anual. Cuando lo haya, la
configuración ya está preparada: basta con un certificado en el llavero para que electron-builder
firme solo, y poner `notarize: true` en la sección `mac` de
[electron-builder.yml](electron-builder.yml) junto a las credenciales para que además notarice. El
CI lo desactiva explícitamente con `CSC_IDENTITY_AUTO_DISCOVERY: false` para que la ausencia de
certificado no rompa la compilación.

### Icono y avisos de terceros

El icono se edita en `build/icon.svg`; `npm run icon` lo rasteriza a `build/icon.png` a 1024 px, el
tamaño que pide el `.icns` de macOS, y electron-builder deriva de ahí el `.ico` de Windows y los
PNG de Linux.

`npm run notices` regenera `THIRD-PARTY-NOTICES.txt`. El script no lleva una lista de librerías
escrita a mano: lee los `import` de `src/`, añade las dependencias de producción —que van al
instalador aunque no se importen— y cierra el árbol siguiendo el `dependencies` de cada paquete.
Añadir una librería nueva no obliga a tocar nada.

### Traducciones

Los catálogos viven en `src/renderer/i18n/locales/`, uno por idioma, con `es.json` como fuente de
verdad. Las claves están tipadas contra ese archivo, así que una clave inventada falla el
`typecheck`, y un test comprueba que los cuatro catálogos tienen exactamente el mismo conjunto de
claves para que no se cuele una traducción a medias.

Al escribir un mensaje nuevo, la frase va entera en la clave. Componer una frase juntando trozos
funciona en español y se rompe en cuanto cambia el orden de las palabras en otro idioma.

### Estructura

```
build/         Icono (SVG como fuente de verdad)
changelog/     Notas de cada versión, una por tag; son el cuerpo de la release
docs/adr/      Decisiones de arquitectura: qué se decidió, frente a qué y por qué
scripts/       Utilidades de build: icono y avisos de terceros
sitio/         Página pública (Astro), publicada en GitHub Pages; proyecto npm aparte
src/
  shared/      Tipos, canales IPC, códigos de error, enlaces y rutas: lo que comparten los tres procesos
  main/
    ipc/       Adaptadores finos sobre los servicios, con la validación de lo que cruza el puente
    services/  Todo el acceso a disco: escaneo, hashing, lectura/escritura, papelera, registro de errores
    argv.ts    Rutas recibidas por la línea de comandos, resueltas contra la carpeta desde la que se lanzó
  preload/     contextBridge -> window.api (contextIsolation y sandbox activados)
  renderer/
    i18n/      Catálogos de traducción, detección de idioma y traducción de errores IPC
    diff/      Motor de comparación (normalize -> lineDiff -> pairing -> similarity -> inlineDiff -> align)
    state/     Stores de zustand: sesión, ajustes, historial y aviso de versión
    components/
      text/    Vista de texto: paneles, alineación, gutters, merge, búsqueda, mapa lateral y hooks
      dir/     Vista de carpetas: tabla-árbol virtualizada y operaciones de archivo
test/          Pruebas de la lógica pura y de los servicios que tocan disco
```

El motor de comparación (`src/renderer/diff/`) es TypeScript puro sin dependencias de UI, y corre
en un Web Worker —uno solo, compartido por todas las pestañas— para que un archivo grande no
congele la interfaz. La suite de tests lo verifica contra una implementación de LCS por
programación dinámica sobre cientos de casos aleatorios.

El proceso principal no confía en lo que le llega por IPC aunque hoy el único que llama sea un
renderer propio: `src/main/ipc/validate.ts` comprueba la forma de cada mensaje antes de tocar el
disco, y `safeJoin` impide que una ruta relativa se salga de la carpeta que se está comparando.

## Licencia

[MIT](LICENSE) © 2026 Carlos Alberto.

Todo lo que se distribuye con la aplicación es software libre con licencia permisiva: 22 paquetes
MIT y uno BSD-3-Clause (`diff`), más el propio Electron (MIT), que ya coloca junto al ejecutable
sus avisos de Chromium y Node. Los avisos de copyright de esos 23 paquetes están en
[THIRD-PARTY-NOTICES.txt](THIRD-PARTY-NOTICES.txt), que se genera solo y viaja en el instalador
junto a la licencia de Cotejo, porque el minificador borra del bundle los comentarios legales que
MIT y BSD exigen conservar.

Las herramientas que solo intervienen en el build no llegan al instalador, así que sus licencias no
alcanzan a lo que se distribuye. Es lo que permite usar `sharp` para generar el icono pese a que su
binario de libvips sea LGPL-3.0.
