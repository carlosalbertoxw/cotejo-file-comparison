# 0005. Sin telemetría: la única conexión es la consulta de versión

- **Estado:** Aceptada
- **Fecha:** 2026-08-10

## Contexto

Cotejo abre archivos del usuario, a menudo de trabajo y a veces privados. Herramientas como
Sentry o una analítica de uso ayudarían a enterarse de fallos, pero mandarían fuera datos de un
programa que no los necesita para funcionar.

## Decisión

- Ni telemetría, ni informes de fallos automáticos, ni analítica. Tampoco en el sitio, que además
  apaga la telemetría de Astro al construirse.
- La única conexión es la consulta diaria a la API de releases de GitHub, a una URL fija, y se puede
  apagar en «Acerca de».
- Para diagnosticar, un registro local de errores (`cotejo.log`) que no sale del equipo y que el
  usuario puede adjuntar si quiere. Solo rutas y errores, nunca contenido.

## Alternativas descartadas

- **Informes de fallos opcionales.** Exigen un servicio externo, un aviso de privacidad y tratar
  rutas de archivos como datos personales. Mucho coste para un proyecto personal.

## Consecuencias

- Los fallos se conocen solo cuando alguien los reporta. «Acerca de» enseña la versión, el sistema
  y dónde está el registro, para que el reporte los pueda traer.
- La promesa está escrita en el sitio («sin telemetría») y en el README. Cualquier conexión nueva
  obliga a cambiar los dos y a sustituir este registro.

## Dónde se aplica

- `src/main/services/updates.ts`, `src/renderer/state/updateStore.ts`.
- `src/main/services/log.ts`.
- `sitio/src/i18n/*.ts` (FAQ de privacidad) y `.github/workflows/pages.yml`
  (`ASTRO_TELEMETRY_DISABLED`).
