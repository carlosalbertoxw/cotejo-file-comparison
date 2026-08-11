# Notas de las versiones

Un archivo por versión, con **el mismo nombre que el tag**: el tag `v0.2.0` se publica con
`changelog/v0.2.0.md`. Lo que haya dentro es el cuerpo de la release en GitHub, así que se escribe
para quien va a descargarla, no para quien escribió el código.

`proxima.md` es el borrador de lo que todavía no ha salido. Se va rellenando durante el desarrollo
y, al publicar, se renombra al tag que toque:

```bash
git mv changelog/proxima.md changelog/v0.2.0.md
```

El workflow de release comprueba antes de construir nada que el archivo del tag existe y que la
`version` de `package.json` coincide con él. Sin eso no publica: una release sin notas obliga al
usuario a adivinar qué cambió, y una versión descuadrada hace que el aviso de actualización de la
propia aplicación mienta.

Debajo de estas notas, GitHub añade solo la lista de commits y de contribuyentes. Aquí va lo otro:
qué cambia para quien usa Cotejo.

## Qué escribir

Frases enteras y en presente, agrupadas por lo que le pasa al usuario —lo nuevo, lo que cambia de
comportamiento, lo que se arregla—, no por la parte del código que se tocó. Si algo obliga a hacer
algo al actualizar, va primero y bien visible.

Lo que no se nota desde fuera (refactores, dependencias, ajustes del build) no necesita línea
propia; para eso ya está la lista de commits que GitHub añade debajo.
