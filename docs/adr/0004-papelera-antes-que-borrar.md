# 0004. Todo lo que se borra o se sobrescribe pasa por la papelera

- **Estado:** Aceptada; el guardado en Windows lo cambia [0006](0006-guardar-en-windows-en-el-sitio.md)
- **Fecha:** 2026-10-04

## Contexto

La vista de carpetas copia, mueve y borra archivos del usuario, a veces carpetas enteras que se
fusionan con otra que ya existe. Una carpeta que se fusiona puede pisar archivos que no se ven en la
tabla: ocultos, excluidos por los filtros o enlaces simbólicos. Lo peor que puede hacer Cotejo es
perder un archivo que el usuario no pidió perder (SECURITY.md).

## Decisión

- Borrar es mandar a la papelera del sistema (`shell.trashItem`), nunca `rm`.
- Antes de copiar o mover encima de un archivo existente, el que había va a la papelera. Si eso
  falla, el elemento falla entero y no se escribe nada encima.
- Antes de ejecutar nada, un plan dice exactamente qué se va a sobrescribir y qué viaja sin verse en
  la tabla, y eso es lo que muestra el diálogo de confirmación.
- Guardar un archivo de texto es atómico (temporal y `rename`), conserva propietario y permisos, y
  se niega si el archivo cambió en el disco desde que se abrió. En Windows, ver
  [0006](0006-guardar-en-windows-en-el-sitio.md).

## Alternativas descartadas

- **Borrado definitivo con confirmación.** La confirmación no protege de seleccionar mal.
- **Copia de seguridad propia.** Duplica lo que ya hace la papelera del sistema, y deja archivos de
  Cotejo por el disco que alguien tendría que limpiar.

## Consecuencias

- Las operaciones son más lentas en carpetas grandes, y la papelera crece.
- Lo que pase en un volumen sin papelera (algunas unidades de red o extraíbles) depende de cómo lo
  trate el sistema con `trashItem`; no está probado. Si se comprueba que alguno borra sin vuelta
  atrás, hay que decidir si avisar antes.
- Mover entre volúmenes copia y luego borra el origen con `rm`: ahí el origen ya está copiado.

## Dónde se aplica

- `src/main/services/fileOpsService.ts` (`applyOne`, `planFileOp`).
- `src/main/services/textFile.ts` (`writeTextFile`).
