/**
 * Catálogo fuente. Define el tipo `Catalog`, así que cualquier clave que se
 * añada aquí y falte en en/fr/pt rompe la comprobación de tipos.
 *
 * Las tres cadenas marcadas con «html» se insertan sin escapar porque llevan
 * marcado propio. Son texto nuestro, escrito a mano; aquí no entra nada que
 * venga de fuera.
 */
export const es = {
  meta: {
    title: 'Cotejo — compara archivos de texto y carpetas lado a lado',
    description:
      'Aplicación de escritorio libre para Windows, macOS y Linux. Compara dos archivos de texto o dos carpetas enteras, edita los dos lados y copia los cambios de uno a otro.'
  },

  nav: {
    skip: 'Saltar al contenido',
    text: 'Texto',
    folders: 'Carpetas',
    colors: 'Colores',
    downloads: 'Descargas',
    github: 'GitHub',
    language: 'Idioma',
    main: 'Principal'
  },

  hero: {
    // html: los dos «strong» destacan las dos cosas que compara.
    lede:
      'Cotejo compara <strong>archivos de texto</strong> y <strong>carpetas completas</strong>. Los muestra enfrentados línea a línea, te deja editar los dos lados y copiar los cambios de uno al otro. Para Windows, macOS y Linux.',
    download: 'Descargar Cotejo',
    source: 'Ver el código',
    latestVersion: 'Última versión',
    freeSoftware: 'Software libre',
    license: 'Gratis y con licencia MIT',
    privacy: 'Sin cuenta, sin anuncios, sin telemetría'
  },

  preview: {
    tab: 'informe.txt ↔ informe.txt',
    versions: 'junio · julio',
    alt:
      'Comparación de dos versiones de un archivo de texto: la línea 3 cambia de 1.240 a 1.310 unidades, la línea «Región: norte» solo está a la izquierda y «Revisado por: Luis» solo a la derecha.',
    caption:
      'Ámbar: la línea existe en los dos lados pero cambió, con la palabra concreta resaltada dentro. Verde azulado: la línea solo está en un lado, y enfrente queda un hueco rayado para que las dos columnas nunca se descuadren. Las flechas de la franja central copian esa diferencia al otro lado.',
    doc: {
      title: 'Informe trimestral',
      salesPre: 'Ventas: ',
      salesOld: '1.240',
      salesNew: '1.310',
      salesPost: ' unidades',
      returns: 'Devoluciones: 38',
      region: 'Región: norte',
      owner: 'Responsable: Ana',
      closing: 'Cierre: 30 de junio',
      reviewer: 'Revisado por: Luis'
    }
  },

  text: {
    eyebrow: 'Comparar texto',
    h2: 'Ver la diferencia y arreglarla en el mismo sitio',
    lede:
      'Los dos paneles son editables. No hace falta abrir otro programa para aplicar lo que acabas de ver.',
    aligned: {
      h3: 'Sin descuadres',
      p: 'Las líneas emparejadas quedan enfrentadas y los huecos ocupan su sitio, así que los dos paneles miden exactamente lo mismo y nunca se desincronizan al hacer scroll.'
    },
    inline: {
      h3: 'La palabra exacta que cambió',
      p: 'Dentro de una línea modificada se resalta el tramo que difiere, no la línea entera. Un mapa lateral resume el archivo completo y salta a cualquier diferencia con un clic.'
    },
    transfer: {
      h3: 'Copiar de un lado a otro',
      p: 'Las flechas de la franja central llevan un bloque al otro lado. Si quieres menos, selecciona el texto y transfiere solo esas líneas. Todo entra en el historial de edición, así que se deshace como cualquier otro cambio.'
    },
    noFiles: {
      h3: 'También sin archivos',
      p: 'Escribe o pega dos textos en los paneles y se comparan igual. Vale mezclar: un archivo a un lado y algo pegado al otro.'
    },
    save: {
      h3: 'Guarda como estaba',
      p: 'Cada lado tiene su propio botón de guardar, y se conservan los finales de línea y el BOM originales del archivo. Editar una línea no te reescribe las otras mil.'
    },
    safeSave: {
      h3: 'Guardar no pisa nada',
      p: 'Si el archivo cambió en el disco desde que lo abriste, Cotejo no escribe: te lo dice y eliges entre recargar o guardar de todas formas. La escritura pasa por un archivo temporal y un cambio de nombre encima, así que un corte a mitad no te deja el archivo incompleto.'
    },
    ignore: {
      h3: 'Lo que decidas ignorar',
      p: 'Espacios, mayúsculas, líneas en blanco y ancho de tabulación. Lo ignorado se marca en gris en vez de desaparecer, para que sepas que sigue ahí.'
    }
  },

  folders: {
    eyebrow: 'Comparar carpetas',
    h2: 'Dos árboles enfrentados, y las operaciones donde las necesitas',
    lede:
      'Cada entrada con su tamaño y su fecha a los dos lados, alineadas fila a fila. Donde algo existe solo en un lado, enfrente queda el mismo hueco rayado que en el comparador de texto.',
    tableCaption: 'Modos de comparación de carpetas',
    colMode: 'Modo',
    colWhat: 'Qué compara',
    colWhen: 'Cuándo usarlo',
    quick: {
      name: 'Rápido',
      what: 'Tamaño y fecha, con 2 s de tolerancia',
      when: 'El uso diario'
    },
    size: {
      name: 'Solo tamaño',
      what: 'Únicamente el tamaño',
      when: 'Barridos muy grandes'
    },
    content: {
      name: 'Contenido',
      what: 'Hash sha256 leído en streaming',
      when: 'Cuando no te puedes fiar de la fecha'
    },
    ops: {
      h3: 'Copiar, mover, borrar y sincronizar',
      p: 'Desde la propia tabla, en cualquiera de los dos sentidos. Todo lo destructivo o que sobrescriba pide confirmación mostrando antes cuántos archivos son, cuántos bytes y la lista de lo que se va a sobrescribir.'
    },
    trash: {
      h3: 'Los borrados van a la papelera',
      p: 'La del sistema: la de Windows, la de macOS o la del escritorio de Linux que toque. Si te equivocas, se recupera desde donde siempre.'
    },
    filters: {
      h3: 'Filtros que se notan',
      pBefore: 'Patrones de exclusión e inclusión, y archivos ocultos opcionales. Excluir una carpeta evita además recorrerla, así que descartar ',
      pAfter: ' no cuesta tiempo: lo ahorra.'
    },
    open: {
      h3: 'Del árbol al texto',
      p: 'Doble clic sobre un archivo distinto lo abre comparado en una pestaña nueva. Si esa comparación ya estaba abierta, salta a ella en vez de duplicarla.'
    },
    keyboard: {
      h3: 'La tabla, también con el teclado',
      p: 'Flechas arriba y abajo para moverse, derecha e izquierda para abrir y cerrar carpetas, Inicio y Fin para los extremos, AvPág y RePág para saltar de pantalla, Espacio para añadir o quitar de la selección y Entrar para abrir la comparación de esa fila.'
    }
  },

  colors: {
    eyebrow: 'Cómo leerlo',
    h2: 'Cálido contra frío, no rojo contra verde',
    lede:
      'Se distingue mejor con los daltonismos más comunes, y deja el rojo libre para significar una sola cosa: esto destruye algo. Todos los textos cumplen un contraste WCAG de 4.5:1, en tema claro y en oscuro.',
    tableCaption: 'Qué significa cada color',
    colColor: 'Color',
    colMeaning: 'Significa',
    amber: {
      name: 'Ámbar',
      meaning:
        'La línea existe en los dos lados pero cambió. Dentro va resaltada la palabra concreta.'
    },
    teal: {
      name: 'Verde azulado',
      meaning: 'La línea solo existe en un lado. El otro muestra un hueco rayado.'
    },
    gray: {
      name: 'Gris atenuado',
      meaning:
        'Difieren solo en algo que pediste ignorar: espacios, mayúsculas o líneas en blanco.'
    },
    red: {
      name: 'Rojo',
      meaning: 'Solo en avisos de acciones destructivas. Nunca es un tipo de diferencia.'
    }
  },

  downloads: {
    eyebrow: 'Descargas',
    h2: 'Descargar Cotejo',
    lede:
      'Cada sistema tiene una versión que se instala y otra que se ejecuta sin instalar. Las dos llevan la misma aplicación dentro.',
    yourSystem: 'tu sistema',
    recommended: 'recomendado',
    releaseNotes: 'Notas de esta versión',
    olderVersions: 'Versiones anteriores',
    // html: el enlace lleva a la página de releases.
    fallback:
      'Los enlaces directos no se pudieron generar al compilar esta página. <a href="https://github.com/carlosalbertoxw/cotejo-file-comparison/releases">Descarga la última versión desde GitHub</a>, donde están siempre todos los instaladores.',
    notes: {
      windows:
        'Windows avisa la primera vez de que el editor no es conocido, porque la aplicación no está firmada: Más información → Ejecutar de todas formas.',
      macos:
        'Sin firma de Apple, macOS la bloquea la primera vez con un aviso que parece de archivo dañado. Se abre con clic derecho sobre la aplicación → Abrir, y a partir de ahí funciona con normalidad.',
      linux:
        'Al AppImage hay que darle permiso de ejecución la primera vez, con chmod +x, y ya se abre con doble clic.'
    },
    items: {
      windowsInstaller: {
        label: 'Instalador',
        detail: 'Se instala y crea su acceso directo. Lo normal.'
      },
      windowsPortable: {
        label: 'Portable',
        detail: 'Un único .exe que se ejecuta sin instalar nada.'
      },
      macArm64Dmg: {
        label: 'Apple Silicon (.dmg)',
        detail: 'Mac con chip M1 o posterior.'
      },
      macIntelDmg: {
        label: 'Intel (.dmg)',
        detail: 'Mac con procesador Intel.'
      },
      macArm64Zip: {
        label: 'Apple Silicon (.zip)',
        detail: 'La aplicación suelta, sin instalador.'
      },
      macIntelZip: {
        label: 'Intel (.zip)',
        detail: 'La aplicación suelta, sin instalador.'
      },
      linuxDeb: {
        label: 'Debian / Ubuntu (.deb)',
        detail: 'Se instala con el gestor de paquetes del sistema.'
      },
      linuxRpm: {
        label: 'Fedora / RHEL (.rpm)',
        detail: 'Se instala con el gestor de paquetes del sistema.'
      },
      linuxAppImage: {
        label: 'AppImage',
        detail: 'Un único archivo. Dale permiso con chmod +x y ábrelo.'
      }
    }
  },

  faq: {
    h2: 'Antes de instalarla',
    price: {
      q: '¿Cuesta algo?',
      a: 'No. Es software libre con licencia MIT, sin versión de pago, sin cuenta y sin anuncios. El código está publicado entero.'
    },
    privacy: {
      q: '¿Envía mis archivos a alguna parte?',
      a: 'No. Todo ocurre en tu equipo. La única conexión que hace es preguntarle a GitHub una vez al día si hay una versión más nueva, y si no hay red se calla y sigue funcionando.'
    },
    updates: {
      q: '¿Se actualiza sola?',
      a: 'No: avisa y te trae aquí. Sustituir el ejecutable por su cuenta exige una aplicación firmada, y eso requiere certificados de pago. El aviso se puede cerrar y no vuelve para esa misma versión.'
    },
    languages: {
      q: '¿En qué idiomas está?',
      a: 'Español, inglés, francés y portugués de Brasil. Toma el del sistema al arrancar y se puede cambiar en cualquier momento. Las fechas y los tamaños siguen al idioma activo.'
    },
    large: {
      q: '¿Aguanta archivos grandes?',
      a: 'La comparación corre fuera del hilo de la interfaz, así que la ventana sigue respondiendo mientras calcula. En carpetas no hay límite de tamaño: el modo contenido lee los archivos en streaming, y comparar dos imágenes de disco cuesta lo mismo en memoria que comparar dos notas. Un archivo de texto se abre hasta 12 MB, que es lo que la aplicación sostiene de verdad; por encima de eso lo dice en vez de intentarlo y quedarse sin memoria.'
    },
    encoding: {
      q: '¿Y los archivos que no están en UTF-8?',
      a: 'Se abren en solo lectura: se comparan con normalidad, pero no se dejan editar. Al leer un .txt heredado en Windows-1252 se pierden las eñes y los acentos, y guardarlo encima escribiría esa pérdida en el disco. Una franja lo avisa al abrirlo.'
    },
    bugs: {
      q: '¿Cómo informo de un fallo?',
      // html: el enlace lleva a los issues del repositorio.
      a: 'En <a href="https://github.com/carlosalbertoxw/cotejo-file-comparison/issues">los issues del repositorio</a>. Cuenta qué hiciste, qué esperabas y qué pasó; con eso suele bastar.'
    }
  },

  footer: {
    license: 'MIT © {year} Carlos Alberto',
    source: 'Código fuente',
    allVersions: 'Todas las versiones',
    report: 'Informar de un problema'
  }
}
