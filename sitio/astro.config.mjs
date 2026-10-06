// @ts-check
import { defineConfig } from 'astro/config'

/**
 * Sitio estatico servido desde GitHub Pages en
 * https://carlosalbertoxw.com/cotejo-file-comparison/
 *
 * El dominio propio se sirve desde las páginas de usuario, así que los
 * repositorios de proyecto siguen colgando de su subcarpeta y `base` no
 * cambia. La dirección de github.io redirige aquí con un 301 permanente.
 *
 * El `base` es obligatorio: Pages sirve los repositorios de proyecto bajo una
 * subcarpeta con el nombre del repo, no en la raiz del dominio. Sin el, todas
 * las rutas absolutas apuntarian un nivel por encima del sitio y no cargaria
 * ni una hoja de estilos.
 */
export default defineConfig({
  site: 'https://carlosalbertoxw.com',
  base: '/cotejo-file-comparison',
  trailingSlash: 'always',
  build: { format: 'directory' },
  compressHTML: true,
  devToolbar: { enabled: false },

  // CSP en una <meta> de cada pagina, con los hashes de cada script y estilo
  // que Astro mete en linea. Hoy no entra contenido de nadie, pero es la
  // pagina desde la que se bajan instalables sin firma: mejor cerrada por si
  // un dia entra algo dinamico.
  //
  // Pages no deja poner cabeceras; las pone Cloudflare para todo el dominio,
  // fuera de este repositorio: HSTS, `X-Frame-Options` y una CSP propia con
  // `frame-ancestors`, que en una <meta> no vale. El navegador aplica las dos
  // CSP a la vez, asi que manda la mas estricta: lo que el dominio permita y
  // esta no —las estadisticas de Cloudflare, por ejemplo— no carga en estas
  // paginas hasta que se anada aqui.
  security: {
    csp: {
      directives: [
        "default-src 'self'",
        "img-src 'self' data:",
        "object-src 'none'",
        "base-uri 'self'",
        "form-action 'none'"
      ]
    }
  },

  // Los mismos cuatro idiomas que la aplicación. El español no lleva prefijo:
  // vive en la raíz, y los demás cuelgan de /en/, /fr/ y /pt/.
  i18n: {
    defaultLocale: 'es',
    locales: ['es', 'en', 'fr', 'pt'],
    routing: { prefixDefaultLocale: false }
  }
})
