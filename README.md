# Cotejo

Pon dos cosas una al lado de la otra y mira en qué se diferencian.

Cotejo es una aplicación de escritorio para **comparar archivos de texto** y **carpetas completas**.
Muestra los dos lados enfrentados línea a línea, deja editarlos, copiar bloques de uno a otro, y
operar sobre los archivos desde la vista de carpetas.

Electron + React + TypeScript. El motor de comparación, la alineación y todo el aspecto visual son
propios; CodeMirror 6 se usa solo como área de texto editable dentro de cada panel.

## Uso

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
- `Ctrl+S` guarda **preservando los finales de línea y el BOM originales**.
- Opciones: ignorar espacios, mayúsculas o líneas en blanco, y ancho de tabulación.

## Comparar carpetas

Tres modos, de más rápido a más fiable:

| Modo | Qué compara | Cuándo usarlo |
| --- | --- | --- |
| Rápido | Tamaño + fecha (2 s de tolerancia) | Uso diario |
| Solo tamaño | Solo el tamaño | Barridos muy grandes |
| Contenido | Hash sha256 en streaming | Cuando no te puedes fiar de la fecha |

Doble clic sobre un archivo distinto lo abre en una pestaña de comparación de texto.

**Los borrados van a la Papelera de reciclaje de Windows**, y toda operación destructiva o que
sobrescriba pide confirmación mostrando antes el número exacto de archivos, los bytes y la lista
de lo que se va a sobrescribir.

## Desarrollo

```bash
npm test
```

```bash
npm run typecheck
```

```bash
npm run package
```

`package` genera un instalador NSIS en `release/`. Antes de empaquetar regenera el icono y los
avisos de terceros, así que no hay que acordarse de ejecutarlos a mano.

El icono se edita en `build/icon.svg`; `npm run icon` lo rasteriza a `build/icon.png` y
electron-builder genera desde ahí el `.ico` multi-resolución que necesita Windows.

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
scripts/       Utilidades de build: icono y avisos de terceros
src/
  shared/      Tipos, canales IPC y códigos de error compartidos por los tres procesos
  main/        Todo el acceso a disco: escaneo, hashing, lectura/escritura, papelera
  preload/     contextBridge -> window.api (contextIsolation activado)
  renderer/
    i18n/      Catálogos de traducción, detección de idioma y traducción de errores IPC
    diff/      Motor de comparación (normalize -> lineDiff -> pairing -> inlineDiff -> align)
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
