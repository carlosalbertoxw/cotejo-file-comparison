## Copiar, mover y borrar dicen en qué carpetas actúan

El diálogo de confirmación enseña la ruta completa de las carpetas de origen y destino (o la del
lado que se borra), además de cuántos archivos van y cuáles se sobrescriben.

Mientras se compara, copiar, mover y borrar están desactivados, y también si se ha escrito otra
ruta y la tabla todavía es la de la comparación anterior. Antes se podía borrar o copiar sobre la
carpeta nueva con la selección de la vieja, y el diálogo no lo delataba porque solo mostraba
rutas relativas.

## Guardar en Windows respeta los permisos del archivo

Guardar un archivo en Windows ya no le cambia los permisos ni los atributos. Hasta ahora, un
archivo con permisos propios (por ejemplo, uno que solo podías leer tú dentro de una carpeta
compartida) pasaba a tener los de la carpeta y lo podía leer cualquiera con acceso a ella. Un
archivo oculto dejaba de estarlo. Ahora el archivo se escribe en su sitio y conserva todo eso.

Mientras dura el guardado hay junto al archivo un temporal `.cotejo-tmp` con lo que se está
guardando. Si el guardado se corta a mitad, ahí está entero.

## Comparar carpetas por contenido

- Dos archivos distintos se dejan de leer en cuanto aparece la primera diferencia, en vez de
  leerse enteros los dos. Con archivos grandes que difieren pronto, la comparación termina mucho
  antes.
- **Cancelar** detiene la comparación al momento, aunque esté a mitad de un archivo de varios
  gigas.
- El modo se llama ahora «Contenido», sin «(hash)»: compara byte a byte.

## Arreglos

- Copiar, mover o borrar miles de carpetas seleccionadas a la vez ya no deja la ventana
  bloqueada mientras se prepara la operación.
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
