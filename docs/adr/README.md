# Decisiones de arquitectura

Las decisiones que cruzan todo el proyecto, con lo que se descartó y por qué. Los detalles de cada
una siguen en los comentarios del código que la aplica; aquí está el porqué de conjunto y el
enlace para llegar a ellos.

Un registro no se reescribe cuando la decisión cambia: se escribe uno nuevo que lo sustituye, y el
viejo pasa a «Sustituida por NNNN». Así se ve también qué se pensó antes y por qué dejó de valer.

Las cinco primeras se registraron a posteriori, el 2026-10-04, a partir del código, el README y
SECURITY.md. La fecha de cada una es la del commit que la puso en marcha.

| N.º | Decisión | Estado |
| --- | --- | --- |
| [0001](0001-renderer-desde-file.md) | El renderer se sirve desde `file://` con privilegios, no por un protocolo propio | Aceptada |
| [0002](0002-sin-firma-ni-autoactualizacion.md) | Sin firma de código ni autoactualización | Aceptada |
| [0003](0003-ipc-confia-en-las-rutas.md) | El puente IPC acepta cualquier ruta que mande el renderer | Aceptada |
| [0004](0004-papelera-antes-que-borrar.md) | Todo lo que se borra o se sobrescribe pasa por la papelera | Aceptada |
| [0005](0005-sin-telemetria.md) | Sin telemetría: la única conexión es la consulta de versión | Aceptada |
| [0006](0006-guardar-en-windows-en-el-sitio.md) | En Windows, guardar escribe en el propio archivo | Aceptada |

## Plantilla

```markdown
# NNNN. Título en forma de decisión

- **Estado:** Propuesta | Aceptada | Sustituida por NNNN
- **Fecha:** AAAA-MM-DD

## Contexto
Qué problema había y qué lo condicionaba.

## Decisión
Qué se hace.

## Alternativas descartadas
Cada una con el motivo.

## Consecuencias
Lo que se gana, lo que se paga y lo que obliga a hacer.

## Dónde se aplica
Archivos y líneas que la llevan a la práctica.
```
