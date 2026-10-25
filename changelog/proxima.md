## Las versiones sin instalar ya vienen en una carpeta

**Si usabas el `.exe` portable de Windows o el AppImage de Linux, descarga ahora el
`Cotejo.<versión>.portable.zip` o el `Cotejo.<versión>.portable.tar.gz`.** Son la aplicación ya
lista en una carpeta: se descomprime una vez donde quieras y se abre `Cotejo.exe` o `cotejo`. Antes
el portable se descomprimía entero en una carpeta temporal cada vez que se abría, así que tardaba
más en arrancar. Tu configuración y tu historial no cambian de sitio y se conservan.

En **Acerca de → Archivos del programa** hay una fila nueva, **Programa**, que dice dónde está
Cotejo —en la versión sin instalar, la carpeta que descomprimiste— con un botón para abrirla. Ya no
aparece la de la copia temporal del portable, que deja de existir.

## Copiar y mover llevan solo lo que ves en la lista

Al copiar o mover una carpeta ya no viaja todo lo que hay dentro, sino exactamente lo que la
tabla lista: los archivos ocultos, los que excluyen los filtros y, con «Solo diferencias», los que
son iguales en los dos lados se quedan donde están. Al mover, la carpeta de origen desaparece si se
queda vacía, y si dentro queda algo que no se listaba, se conserva con ello. Sincronizar sigue la
misma regla.

Borrar no cambia: una carpeta va entera a la papelera, y el diálogo avisa de lo que no se veía.

## Porcentaje de avance y botón para cancelar

Mientras se copia o se mueve, la barra de progreso enseña el porcentaje (calculado sobre los datos,
no sobre el número de archivos) y el archivo en curso.

El botón **Cancelar** detiene la operación al momento, aunque esté a mitad de un archivo grande, y
deshace lo preparado: cancelar no cambia nada en ninguna de las dos carpetas. Para eso cada archivo
se copia primero a un temporal `.cotejo-….tmp` junto a su destino, y solo cuando todos están listos
pasan a su sitio. Esa última parte es rápida y ya no se puede cancelar.

## Seleccionar varias cosas a la vez

- En la comparación de carpetas, **Mayús+clic** selecciona todas las filas entre la última pinchada
  y esta, y **Ctrl+clic** (⌘ en macOS) añade o quita una sola. Con el teclado, **Mayús+flechas**
  (o Inicio, Fin, Re Pág, Av Pág) extiende la selección, **Ctrl+A** selecciona todo lo que se ve y
  **Escape** la vacía. Copiar, mover y borrar actúan sobre todo lo seleccionado.
- En la comparación de texto, **Ctrl+clic** o **Ctrl+arrastrar** (⌘ en macOS) añade más tramos a
  la selección, y **Alt+arrastrar** selecciona en columna. «Selección ▶» y «◀ Selección» llevan
  todos los tramos al otro lado de una vez, cada uno frente a sus líneas, sin tocar las
  diferencias de en medio. Un solo Ctrl+Z lo deshace entero. La barra de estado dice cuántas
  líneas y en cuántos tramos.

## La pestaña Inicio siempre está

La pantalla de inicio, con el historial de comparaciones recientes, es ahora una pestaña fija a la
izquierda de las demás. Se puede volver a ella en cualquier momento sin cerrar nada, también con
Ctrl+Tab.

## Arreglos

- El mensaje con el resultado de copiar, mover o borrar se quedaba en blanco porque la tabla se
  volvía a comparar justo después. Ahora se queda en la barra de estado.

## Por debajo

- Electron pasa a la 44.9.3.
