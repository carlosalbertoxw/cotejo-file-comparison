# 0002. Sin firma de código ni autoactualización

- **Estado:** Aceptada
- **Fecha:** 2026-08-10

## Contexto

Firmar en macOS exige el Apple Developer Program, de pago anual, y en Windows un certificado de
firma de código. Es un proyecto personal sin ingresos.

La autoactualización (electron-updater o Squirrel) descarga un ejecutable y sustituye el instalado.
Sin firma, lo único que garantiza que lo descargado es legítimo es el canal, y una actualización
silenciosa convierte un fallo de ese canal en código ejecutándose en todos los equipos a la vez.

## Decisión

- Los instalables se publican sin firmar.
- La aplicación no se actualiza sola: consulta una vez al día la última release y, si hay una más
  nueva, enseña un aviso que lleva a la página de descargas. El usuario decide.
- En su lugar, cada release lleva `SHA256SUMS.txt`, un SBOM y una atestación de procedencia de
  GitHub que se comprueba con `gh attestation verify`.

## Alternativas descartadas

- **Autoactualización sin firma.** Técnicamente posible en Windows y Linux, pero es el peor de los
  dos mundos: actualiza solo y no hay nada que verifique lo que instala.
- **Firmar solo en Windows.** No quita el problema de macOS y añade un coste fijo.

## Consecuencias

- Aviso de SmartScreen la primera vez en Windows; en macOS hay que abrir con clic derecho → Abrir.
  Está explicado en el README y en el sitio.
- La integridad depende de la cuenta de GitHub y del workflow de release. Por eso los jobs que
  instalan dependencias no tienen permisos de escritura, y SECURITY.md tiene un plan para una
  release comprometida.
- Quien instaló una versión retirada no recibe aviso de la aplicación, porque la suya es más nueva
  que la que pasa a figurar como última.
- Si llega un certificado, la configuración ya está preparada (README, «Firma»), y este registro se
  revisa: la autoactualización pasaría a ser una opción razonable.

## Dónde se aplica

- `src/main/services/updates.ts` y su comentario.
- `.github/workflows/release.yml` (sumas, SBOM, atestación) y `CSC_IDENTITY_AUTO_DISCOVERY: false`.
- `electron-builder.yml`: `notarize: false` y su comentario.
