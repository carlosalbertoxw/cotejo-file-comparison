# 0007. Copiar y mover llevan solo lo listado, y se preparan antes de tocar nada

- **Estado:** Aceptada
- **Fecha:** 2026-10-24

## Contexto

Hasta la 0.8.0, copiar o mover una carpeta la llevaba entera con `cp` o `rename`: también lo que
la tabla no enseñaba (ocultos, excluidos por los filtros, enlaces) y, con «Solo diferencias», los
archivos iguales, que se sobrescribían mandando cada copia del destino a la papelera.
[0004](0004-papelera-antes-que-borrar.md) lo mitigaba avisando en el diálogo de lo que viajaba sin
verse, pero el usuario no tenía forma de dejarlo fuera.

Tampoco se podía parar una operación larga sin dejarla a medias: con `cp` sobre una carpeta, cortar
deja parte de los archivos en el destino y, encima de algunos que había, ya mandados a la papelera.

## Decisión

- **Solo lo listado.** El renderer convierte la selección en lo que la tabla lista debajo de cada
  elemento, con los mismos filtros con los que se escaneó y «Solo diferencias». En copiar y mover,
  una carpeta solo se crea en el destino; su contenido llega elemento a elemento. Al mover, la
  carpeta de origen se quita con `rmdir` si se ha quedado vacía, así que lo no listado se queda con
  ella. Borrar no cambia: manda la carpeta entera a la papelera, como dice 0004.
- **Dos fases.** *Preparar* crea las carpetas que falten y copia cada archivo a un temporal
  `.cotejo-<código>.tmp` en la misma carpeta que su destino, sin tocar nada de lo que ya había. Se
  puede cancelar en cualquier momento, también a mitad de un archivo, y entonces se borran los
  temporales y las carpetas creadas. *Confirmar* manda a la papelera lo que se va a pisar y pone
  cada temporal en su sitio con un `rename` en la misma carpeta; esa fase ya no se cancela.
- Mover dentro del mismo volumen no prepara nada: es un `rename` del archivo en la fase de
  confirmar. Entre volúmenes, el archivo se prepara como al copiar y el origen se borra al
  confirmar.

## Alternativas descartadas

- **Seguir con `cp` de la carpeta y aplicar los filtros en el proceso principal.** El proceso
  principal no sabe qué esconde «Solo diferencias», que sale de la comparación del renderer.
- **Cancelar entre elementos sin deshacer.** Deja la operación a medias, que es lo que se quería
  evitar.
- **Deshacer de verdad tras confirmar**, devolviendo desde la papelera lo pisado. Electron no da
  forma de restaurar desde la papelera, y escribir eso para tres sistemas no compensa frente a no
  dejar cancelar la fase corta.
- **Temporales en la carpeta temporal del sistema.** El `rename` final cruzaría de volumen y dejaría
  de ser instantáneo y atómico.

## Consecuencias

- Cancelar copiar o mover no cambia nada en ninguna de las dos carpetas.
- Copiar ocupa, mientras dura, el doble en el destino para lo que se sobrescribe: el original sigue
  ahí hasta confirmar.
- Si la aplicación se cierra de golpe al preparar, quedan temporales `.cotejo-….tmp` ocultos junto a
  los destinos. Se pueden borrar sin más.
- El progreso se mide en bytes al preparar y en elementos al confirmar.
- La lista de elementos de una copia puede ser larga; el validador del IPC la limita a 100 000.

## Dónde se aplica

- `src/renderer/components/dir/listedItems.ts` (qué lleva una copia o un movimiento).
- `src/main/services/fileOpsService.ts` (`runTransfer`, `copyToTemp`, `commitTransfer`,
  `rollback`).
- `test/fileOps.test.ts` y `test/listedItems.test.ts`.
