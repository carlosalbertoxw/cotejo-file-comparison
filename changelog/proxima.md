## Cerrar con cambios sin guardar pregunta antes

Cerrar una pestaña —con su ✕ o con `Ctrl+W`— la tiraba sin mirar si tenía cambios, aunque el ●
lo estuviera avisando. Ahora pregunta, y deja guardar y cerrar, cerrar sin guardar o seguir donde
estabas. Avisa también del texto escrito o pegado en un panel sin archivo, que no tiene dónde
guardarse y se perdería igual. Cerrar la ventana o salir de la aplicación con trabajo pendiente
pregunta lo mismo.

## Lo que se sobrescribe va a la papelera

Copiar o mover encima de archivos que ya existen los sustituía sin vuelta atrás. Ahora los que
había van antes a la papelera del sistema, como los borrados, y se pueden recuperar.

## El diálogo de copiar y mover dice exactamente qué se pierde

Si una carpeta existe en los dos lados, el diálogo lista uno por uno los archivos de dentro que se
van a sobrescribir; antes solo nombraba la carpeta. Y avisa de los archivos que viajan con ella
aunque la tabla no los muestre: los ocultos, los excluidos por los filtros y los enlaces
simbólicos. Copiar `src/` con los filtros por defecto podía pisar un `.env` del otro lado sin que
apareciera en ninguna parte.

## Un registro de errores para informar de problemas

Si una copia, un movimiento, un borrado o un guardado fallan, o la ventana se cierra de golpe,
Cotejo lo anota en `cotejo.log`: cuándo, qué operación, sobre qué ruta y con qué error. Nunca el
contenido de los archivos, y nunca sale del equipo. «Acerca de» dice dónde está y tiene un botón
para abrir la carpeta, por si quieres adjuntarlo al informar de un problema. No pasa de 2 MB.

## Arreglos

- Con Cotejo ya abierto, `cotejo notas.txt` desde una terminal en otra carpeta abría el
  `notas.txt` de la carpeta desde la que se lanzó Cotejo la primera vez, o nada si ahí no había
  ninguno. Ahora abre el de la carpeta en la que estás. Las rutas que llegan así se guardan además
  completas en las pestañas y el historial, y siguen valiendo en el siguiente arranque.
- Una ruta escrita a mano sin la carpeta de inicio, como `notas.txt`, ya no se busca en una
  carpeta que no elegiste: Cotejo avisa de que tiene que ser una ruta completa.
- Una expresión regular que tarda demasiado ya no congela la ventana al buscar: a los dos segundos
  la búsqueda se detiene y la caja lo indica.
- `Ctrl+T` y `Ctrl+W` funcionan también con Bloq Mayús activado.
- Preparar la copia de una carpeta que contiene un enlace simbólico ya no recorre lo que hay al
  otro lado del enlace, que podía ser el disco entero o la propia carpeta en bucle.
- El archivo temporal de cada guardado lleva ahora un nombre al azar (`.<código>.cotejo-tmp`), y
  dos guardados a la vez en la misma carpeta ya no pueden chocar.

## Inventario de lo que va dentro

Cada release lleva un `Cotejo-X.Y.Z-sbom.cdx.json` con las versiones exactas de Electron y de cada
paquete que entra en la aplicación, en formato CycloneDX. Sirve para saber si un aviso de
seguridad sobre alguno de ellos afecta a la versión que tienes, y va cubierto por las sumas y por
la atestación igual que los instalables.
