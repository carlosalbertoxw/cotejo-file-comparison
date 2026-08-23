# Sitio de Cotejo

La página pública de Cotejo: qué es, cómo se lee una comparación y dónde descargarla. Se publica
en GitHub Pages, en <https://carlosalbertoxw.com/cotejo-file-comparison/>. La dirección de
`github.io` redirige ahí con un 301 permanente.

La aplicación enlaza a esta página desde «Acerca de» y desde el aviso de versión nueva, en el
idioma que tenga activo (`src/shared/links.ts`). Si el sitio cambia de dirección o de estructura
de rutas, hay que tocar ese archivo además de `astro.config.mjs`.

Es un proyecto **aparte del de la raíz**, con su propio `package.json` y su propio lockfile. Esa
separación no es estética: `scripts/make-notices.mjs` recorre los `import` de `src/` para generar
los avisos de terceros que viajan en el instalador, y electron-builder empaqueta el `package.json`
de la raíz. Si Astro viviera ahí, acabaría dentro de la aplicación de escritorio.

## Desarrollo

```bash
npm install
```

```bash
npm run dev
```

```bash
npm run build
```

```bash
npm run check
```

`build` deja el sitio en `dist/`, que el `.gitignore` de la raíz ya ignora. `check` comprueba los
tipos, y es lo que avisa de una traducción incompleta (ver más abajo).

Hace falta **Node 22.12 o posterior**: lo pide Astro 7 y está declarado en `engines`. Los tres
workflows usan Node 22. En Node 24 sobre Windows el build termina con un `Assertion failed` de
libuv después de haber escrito las cuatro páginas: la salida es correcta y completa, pero el
proceso devuelve un código de error. Es cosa del entorno, no del sitio; con Node 22 no ocurre.

## Idiomas

Los mismos cuatro que la aplicación: **español, inglés, francés y portugués de Brasil**. El
español no lleva prefijo porque es el idioma por defecto; los demás cuelgan del suyo:

| Idioma | Ruta |
| --- | --- |
| Español | `/cotejo-file-comparison/` |
| Inglés | `/cotejo-file-comparison/en/` |
| Francés | `/cotejo-file-comparison/fr/` |
| Portugués (BR) | `/cotejo-file-comparison/pt/` |

Cada página declara su `<html lang>`, sus `hreflang` recíprocos y su `og:locale`, y las fechas y
los tamaños de descarga se formatean con `Intl` en el idioma activo, igual que hace la aplicación.

Los textos viven en `src/i18n/`, un archivo por idioma. **`es.ts` es el catálogo fuente y define
el tipo**: los otros tres se declaran como `Catalog`, así que una clave que falte o sobre es un
error de compilación y `npm run check` lo dice antes de publicar. Es la misma garantía que da el
test de paridad de catálogos de la aplicación, pero sin necesidad de test.

Para añadir una sección nueva:

1. Añade las claves a `src/i18n/es.ts`.
2. Ejecuta `npm run check`: los otros tres catálogos fallarán señalando exactamente lo que falta.
3. Tradúcelas y vuelve a comprobar.

Para añadir un idioma, mete su código en `LANGS` (`src/i18n/index.ts`), crea su archivo y rellena
las tablas `LOCALE_TAG`, `HTML_LANG`, `OG_LOCALE`, `ENDONYM` y `SHORT_NAME`; TypeScript se encarga
de recordarte cuáles son. Las rutas se generan solas.

Tres cadenas del catálogo llevan marcado propio (`hero.lede`, `downloads.fallback` y `faq.bugs.a`)
y se insertan con `set:html`. Van marcadas con un comentario. Es texto nuestro escrito a mano; ahí
no entra nada que venga de fuera.

Los identificadores de ancla (`#text`, `#folders`, `#downloads`…) **no se traducen**, para que un
enlace compartido siga funcionando al cambiar de idioma.

## Enlaces de descarga

No están escritos a mano. Al compilar, `src/lib/release.ts` consulta la última release del
repositorio y clasifica sus artefactos por nombre —los que fija `electron-builder.yml`— en tres
plataformas. Cada variante se identifica con una clave (`windowsInstaller`, `macArm64Dmg`…) y su
texto sale del catálogo, así que ahí dentro no hay ni una cadena traducible. La consulta se hace
una sola vez por compilación, aunque la pidan las cuatro páginas.

Así la página es HTML plano, sin peticiones desde el navegador, y no gasta la cuota de la API en
cada visita.

Si la consulta falla, el sitio se construye igual y en su lugar aparece un enlace a la página de
releases. Nunca deja de compilar por eso.

Para probar en local con la cuota de peticiones autenticada:

```bash
GITHUB_TOKEN=tu_token npm run build
```

## Publicación

Lo hace `.github/workflows/pages.yml`, que se dispara:

- al empujar cambios de `sitio/**` a `main`,
- al **publicar una release** —porque los enlaces de descarga se resuelven al compilar y hay que
  regenerarlos—,
- o a mano, desde la pestaña Actions.

En el repositorio, Settings → Pages → *Source* tiene que estar en **GitHub Actions**. Con la opción
por rama no se ejecuta ninguna compilación y no se publicaría nada.

## Un apunte sobre el `base`

GitHub Pages sirve los repositorios de proyecto bajo `/<nombre-del-repo>/`, no en la raíz del
dominio. Por eso `astro.config.mjs` fija `base: '/cotejo-file-comparison'`, y las rutas escritas a
mano se construyen con los ayudantes `localePath()` y `assetPath()` de `src/i18n/index.ts`. Astro
no las reescribe solo. Si algún día el sitio pasa a un dominio propio, hay que quitar el `base` y
añadir el `CNAME`.

## La vista previa de la comparación

El bloque de la portada que enseña dos paneles enfrentados es HTML y CSS
(`src/components/DiffPreview.astro`), no una captura: pesa unos pocos kB, se adapta al tema claro u
oscuro del visitante, se traduce con el resto del sitio —incluido el separador de millares del
número que cambia— y usa exactamente la misma paleta que `src/renderer/styles/theme.css`. Si algún
día hay capturas reales de la aplicación, ese componente es lo que hay que sustituir.
