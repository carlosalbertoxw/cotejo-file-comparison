## Buscar dentro de la comparación

Cada panel de la comparación de texto tiene ahora su propia caja de búsqueda, como la de «buscar en
la página» del navegador. El botón **Buscar** de la barra, o `Ctrl+F` (`⌘F` en macOS), la abre en el
panel donde estabas, resalta todas las coincidencias de ese lado y dice en cuál de cuántas estás.

- `Intro` y `Shift+Intro` van a la siguiente y a la anterior; mientras la caja siga abierta, `F3` y
  `Shift+F3` hacen lo mismo sin volver a ella, y `Esc` la cierra.
- Se puede distinguir mayúsculas y minúsculas, buscar solo palabras completas o escribir una
  expresión regular.
- Si al abrirla había texto seleccionado dentro de una línea, se busca eso directamente.
- Son dos cajas independientes, una por lado, porque son dos textos distintos: se puede dejar la
  izquierda marcando una palabra y buscar otra en la derecha.

El resaltado va en violeta, un color que no usa ninguna diferencia: solo se pinta encima de lo que
coincide, así que el resto de la línea conserva su color y una coincidencia dentro de una línea
cambiada se sigue leyendo como las dos cosas. La coincidencia actual lleva además un contorno, para
no depender solo del color.
