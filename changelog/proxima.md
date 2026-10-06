## Copiar, mover y borrar dicen en qué carpetas actúan

El diálogo de confirmación enseña la ruta completa de las carpetas de origen y destino (o la del
lado que se borra), además de cuántos archivos van y cuáles se sobrescriben.

Mientras se compara, copiar, mover y borrar están desactivados, y también si se ha escrito otra
ruta y la tabla todavía es la de la comparación anterior. Antes se podía borrar o copiar sobre la
carpeta nueva con la selección de la vieja, y el diálogo no lo delataba porque solo mostraba
rutas relativas.

## Arreglos

- Seleccionar una carpeta y algo de dentro ya no hace que el diálogo cuente dos veces esos
  archivos y sus bytes.
- Copiar una carpeta sobre otra en la que una subcarpeta es un enlace simbólico o una unión de
  Windows ya no escribe ni manda a la papelera nada fuera de las carpetas comparadas: la operación
  falla y lo dice.
- Si al guardar con `Ctrl+S` los dos archivos han cambiado en el disco, se pregunta por cada uno.
  Antes solo se avisaba del derecho, y el izquierdo se quedaba sin guardar.
- Elegir otro archivo mientras el anterior aún se estaba leyendo ya no puede dejar en el panel el
  contenido del primero.
- En macOS, «Abrir con Cotejo» desde Finder con la aplicación abierta y sin ventanas abre una
  ventana con los archivos, en vez de esperar a que se pulse el Dock.
