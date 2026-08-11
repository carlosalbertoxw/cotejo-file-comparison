# Cotejo

Pon dos cosas una al lado de la otra y mira en qué se diferencian.

Cotejo es una aplicación de escritorio para **comparar archivos de texto** y **carpetas completas**.
Muestra los dos lados enfrentados línea a línea, deja editarlos, copiar bloques de uno a otro, y
operar sobre los archivos desde la vista de carpetas.

Electron + React + TypeScript. El motor de comparación, la alineación y todo el aspecto visual son
propios; CodeMirror 6 se usa solo como área de texto editable dentro de cada panel.

## Instalación

Cada plataforma tiene una versión que instala y otra que se ejecuta sin instalar. Todas llevan la
misma aplicación dentro.

| Sistema | Instala | Sin instalar |
| --- | --- | --- |
| Windows | `Cotejo Setup <versión>.exe` | `Cotejo <versión> portable.exe` |
| Linux | `.deb` (Debian, Ubuntu) o `.rpm` (Fedora, RHEL) | `Cotejo <versión> portable.AppImage` |
| macOS | `Cotejo <versión> arm64.dmg` (Apple Silicon) o `x64.dmg` (Intel) | `.zip` con la app dentro |

Al AppImage hay que darle permiso de ejecución la primera vez, con `chmod +x`, y ya se abre con
doble clic.

En macOS la aplicación **no está firmada**, porque firmarla exige una cuenta de pago de Apple.
Gatekeeper la bloqueará la primera vez con un aviso que parece de archivo dañado; se abre con clic
derecho sobre la app → Abrir, y a partir de ahí funciona con normalidad. Los atajos usan ⌘ en vez
de Ctrl, como cualquier otra aplicación de macOS.

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
uno o dos archivos o carpetas sobre la ventana hace lo mismo.

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

Todas las combinaciones de texto sobre fondo cumplen un contraste WCAG de 4.5:1 (3:1 en los
elementos secundarios como la numeración de líneas), en tema claro y oscuro.

## Comparar texto

- Las líneas emparejadas quedan enfrentadas, con huecos donde un lado no tiene contenido. Los dos
  paneles miden exactamente lo mismo, así que nunca se desincronizan al hacer scroll.
- `F7` / `Shift+F7` saltan a la diferencia siguiente / anterior. El mapa de la derecha resume el
  archivo entero y permite saltar con un clic.
- Las flechas ◀ ▶ de la franja central copian un bloque al otro lado. Se aplican como una edición
  normal, así que `Ctrl+Z` las deshace.
- `Ctrl+S` (`⌘S` en macOS) guarda **preservando los finales de línea y el BOM originales**.
- Opciones: ignorar espacios, mayúsculas o líneas en blanco, y ancho de tabulación.

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

Doble clic sobre un archivo distinto lo abre en una pestaña de comparación de texto.

**Los borrados van a la papelera del sistema** —la de Windows, macOS o el escritorio de Linux que
toque—, y toda operación destructiva o que sobrescriba pide confirmación mostrando antes el número
exacto de archivos, los bytes y la lista de lo que se va a sobrescribir.

## Acerca de y actualizaciones

El botón **Acerca de**, en la barra de pestañas y en la pantalla de bienvenida, abre una ficha con
la versión instalada, la licencia, las versiones de Electron, Chromium y Node, y enlaces al código
fuente, a las descargas y a los problemas. Los enlaces abren el navegador del sistema, nunca dentro
de la ventana.

Una vez al día Cotejo pregunta a GitHub cuál es la última release publicada. Si hay una más nueva
que la instalada, aparece una franja sobre la barra de pestañas con un enlace a la
[página de descargas](https://github.com/carlosalbertoxw/cotejo-file-comparison/releases). El aviso
se puede cerrar y no vuelve para esa misma versión, pero sí para la siguiente. Desde «Acerca de»
también se puede comprobar a mano en cualquier momento.

Cotejo **no se actualiza solo**: descargar y sustituir el ejecutable por su cuenta exige una
aplicación firmada, y sin certificado eso no se sostiene. Solo avisa y te lleva a la descarga. Si
no hay red, el aviso se calla y lo reintenta al siguiente arranque.

## Desarrollo

```bash
npm test
```

```bash
npm run typecheck
```

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
docker run --rm -v "${PWD}:/project" -v cotejo-node-modules:/project/node_modules -w /project electronuserland/builder:latest bash -c "npm ci && npm run package:linux"
```

El volumen sobre `node_modules` no es un detalle menor: sin él, el `npm ci` de dentro reemplazaría
en tu disco los binarios de Windows por los de Linux —`sharp` entre ellos— y `npm run dev` dejaría
de arrancar. Montándolo aparte, las dependencias del contenedor viven en su propio volumen y las
tuyas quedan intactas.

### Publicar una release

Las notas de cada versión viven en [`changelog/`](changelog/), un archivo por versión con el mismo
nombre que su tag. Son el cuerpo de la release en GitHub, así que se escriben a mano: lo que la
lista de commits no cuenta es justo lo que le interesa a quien va a descargarla.

Mientras se trabaja, lo nuevo se va anotando en `changelog/proxima.md`. Publicar es subir la
versión, renombrar ese archivo y empujar el tag:

```bash
git mv changelog/proxima.md changelog/v0.2.0.md
```

```bash
git tag v0.2.0 && git push origin v0.2.0
```

`.github/workflows/release.yml` construye entonces las tres plataformas en paralelo y deja una
release en borrador con todos los instalables adjuntos. Es la vía práctica para macOS, porque el
runner `macos-latest` de GitHub Actions hace de Mac sin tener que comprar uno.

Antes de empaquetar nada, el workflow comprueba dos cosas y aborta si falla alguna: que existe el
archivo de notas del tag, y que **el tag y la `version` de `package.json` coinciden**. Lo segundo
importa porque el aviso de nueva versión compara la etiqueta de la última release con la versión que
lleva dentro el ejecutable; publicar `v0.2.0` sin subir antes `package.json` dejaría a todas las
copias recién instaladas creyéndose desactualizadas.

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
scripts/       Utilidades de build: icono y avisos de terceros
src/
  shared/      Tipos, canales IPC y códigos de error compartidos por los tres procesos
  main/        Todo el acceso a disco: escaneo, hashing, lectura/escritura, papelera
  preload/     contextBridge -> window.api (contextIsolation activado)
  renderer/
    i18n/      Catálogos de traducción, detección de idioma y traducción de errores IPC
    diff/      Motor de comparación (normalize -> lineDiff -> pairing -> similarity -> inlineDiff -> align)
    components/
      text/    Vista de texto: paneles, alineación, gutters, merge, mapa lateral
      dir/     Vista de carpetas: tabla-árbol virtualizada y operaciones de archivo
```

El motor de comparación (`src/renderer/diff/`) es TypeScript puro sin dependencias de UI, y corre
en un Web Worker para que un archivo grande no congele la interfaz. La suite de tests lo verifica
contra una implementación de LCS por programación dinámica sobre cientos de casos aleatorios.

## Licencia

[MIT](LICENSE) © 2026 Carlos Alberto.

Todo lo que se distribuye con la aplicación es software libre con licencia permisiva: 23 paquetes
MIT y uno BSD-3-Clause (`diff`), más el propio Electron (MIT), que ya coloca junto al ejecutable
sus avisos de Chromium y Node. Los avisos de copyright de esos 24 paquetes están en
[THIRD-PARTY-NOTICES.txt](THIRD-PARTY-NOTICES.txt), que se genera solo y viaja en el instalador
junto a la licencia de Cotejo, porque el minificador borra del bundle los comentarios legales que
MIT y BSD exigen conservar.

Las herramientas que solo intervienen en el build no llegan al instalador, así que sus licencias no
alcanzan a lo que se distribuye. Es lo que permite usar `sharp` para generar el icono pese a que su
binario de libvips sea LGPL-3.0.
