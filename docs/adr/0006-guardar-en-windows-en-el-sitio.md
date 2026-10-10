# 0006. En Windows, guardar escribe en el propio archivo

- **Estado:** Aceptada
- **Fecha:** 2026-10-10

## Contexto

[0004](0004-papelera-antes-que-borrar.md) decidió que guardar un archivo de texto fuera atómico:
el contenido nuevo va a un temporal en la misma carpeta y un `rename` lo pone encima. En POSIX
`inheritOwnership` le copia al temporal el propietario y el modo del original, y el resultado es
el mismo archivo con otro contenido.

En Windows no hay equivalente. Los permisos de verdad son la ACL, que `chmod` no toca, y el
temporal nace con la ACL heredada de la carpeta y sin los atributos del original. Comprobado en
Windows 10:

- Un archivo con la herencia cortada y acceso solo para su dueño quedaba, después de guardarlo,
  con las entradas heredadas de la carpeta. En una carpeta compartida, eso lo hace legible para
  todos los que leen la carpeta.
- Un archivo oculto dejaba de estarlo.
- Se perdían también los flujos alternativos (`Zone.Identifier`) y la fecha de creación.

`fs.copyFile` copia los atributos pero no la ACL. `ReplaceFileW`, que hace el reemplazo atómico
conservando todo, no está en Node.

## Decisión

En Windows, si el archivo ya existe, se escribe en él (`r+`, `truncate`, escribir, `sync`) en vez
de sustituirlo. Antes se escribe el contenido nuevo completo en un temporal junto al archivo:

- Si el archivo no se puede abrir (solo lectura, bloqueado por otro programa), no se ha tocado
  nada y el temporal se borra.
- Si falla a mitad de escribir, el temporal se queda. Es la copia completa de lo que se estaba
  guardando, y «Acerca de» y el README explican qué hacer con uno suelto.
- Si todo va bien, el temporal se borra.

En POSIX y para los archivos nuevos no cambia nada. Los enlaces simbólicos y los archivos con
varios enlaces duros se siguen escribiendo en su sitio en todos los sistemas, ahora con `r+` en
lugar de `w`, porque en Windows `w` falla con `EPERM` sobre un archivo oculto.

## Alternativas descartadas

- **Renombrar y restaurar después** la ACL (`icacls /save` y `/restore`) y los atributos
  (`attrib`). Depende de lanzar programas del sistema, y entre el `rename` y la restauración el
  archivo queda con la ACL de la carpeta.
- **Escribir en el sitio solo si el archivo está oculto.** No arregla la ACL, que es la parte de
  confidencialidad.
- **Un módulo nativo con `ReplaceFileW`.** Conservaría la atomicidad, pero sería la primera
  dependencia nativa del proyecto: compilarla para tres sistemas y dos arquitecturas, y aprobar su
  script de instalación (`allowScripts`).

## Consecuencias

- En Windows, un guardado cortado a mitad puede dejar el archivo incompleto. El trabajo no se
  pierde porque está en el temporal, pero hay que recuperarlo a mano.
- Mientras dura el guardado, el temporal tiene la ACL de la carpeta. Si el guardado falla a mitad,
  esa copia se queda con esa ACL hasta que alguien la borre.
- El archivo conserva su ACL, sus atributos, sus flujos alternativos, su fecha de creación y sus
  enlaces duros.

## Dónde se aplica

- `src/main/services/textFile.ts` (`writeTextFile`, `writeWithBackup`, `overwriteInPlace`).
- `test/textFile.test.ts` (pruebas solo de Windows, que corren en el job de Windows de `ci.yml`).
