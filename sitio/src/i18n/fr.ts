import type { Catalog } from './index'

export const fr: Catalog = {
  meta: {
    title: 'Cotejo — comparez fichiers texte et dossiers côte à côte',
    description:
      'Application de bureau libre pour Windows, macOS et Linux. Comparez deux fichiers texte ou deux dossiers entiers, modifiez les deux côtés et copiez les changements de l’un vers l’autre.'
  },

  nav: {
    skip: 'Aller au contenu',
    text: 'Texte',
    folders: 'Dossiers',
    colors: 'Couleurs',
    downloads: 'Téléchargements',
    github: 'GitHub',
    language: 'Langue',
    main: 'Principal'
  },

  hero: {
    lede:
      'Cotejo compare des <strong>fichiers texte</strong> et des <strong>dossiers entiers</strong>. Il les affiche face à face, ligne par ligne, vous laisse modifier les deux côtés et copier les changements de l’un vers l’autre. Pour Windows, macOS et Linux.',
    download: 'Télécharger Cotejo',
    source: 'Voir le code',
    latestVersion: 'Dernière version',
    freeSoftware: 'Logiciel libre',
    license: 'Gratuit, sous licence MIT',
    privacy: 'Sans compte, sans publicité, sans télémétrie'
  },

  preview: {
    tab: 'rapport.txt ↔ rapport.txt',
    versions: 'juin · juillet',
    alt:
      'Comparaison de deux versions d’un fichier texte : la ligne 3 passe de 1 240 à 1 310 unités, la ligne « Région : nord » n’existe qu’à gauche et « Révisé par : Luis » qu’à droite.',
    caption:
      'Ambre : la ligne existe des deux côtés mais a changé, avec le mot précis surligné à l’intérieur. Bleu-vert : la ligne n’existe que d’un côté, et un espace hachuré tient sa place en face pour que les deux colonnes ne se décalent jamais. Les flèches de la bande centrale copient cette différence de l’autre côté.',
    doc: {
      title: 'Rapport trimestriel',
      salesPre: 'Ventes : ',
      salesOld: '1 240',
      salesNew: '1 310',
      salesPost: ' unités',
      returns: 'Retours : 38',
      region: 'Région : nord',
      owner: 'Responsable : Ana',
      closing: 'Clôture : 30 juin',
      reviewer: 'Révisé par : Luis'
    }
  },

  text: {
    eyebrow: 'Comparer du texte',
    h2: 'Voir la différence et la corriger au même endroit',
    lede:
      'Les deux panneaux sont modifiables. Inutile d’ouvrir un autre programme pour appliquer ce que vous venez de voir.',
    aligned: {
      h3: 'Jamais décalé',
      p: 'Les lignes appariées se font face et les espaces occupent leur place : les deux panneaux ont exactement la même hauteur et ne se désynchronisent jamais au défilement.'
    },
    inline: {
      h3: 'Le mot exact qui a changé',
      p: 'Dans une ligne modifiée, seule la portion qui diffère est surlignée, pas la ligne entière. Une carte latérale résume tout le fichier et saute à n’importe quelle différence d’un clic.'
    },
    find: {
      h3: 'Rechercher dans chaque panneau',
      p: 'Ctrl+F ouvre une boîte comme celle de « rechercher dans la page » du navigateur, dans le panneau où vous étiez : elle surligne toutes les occurrences, indique laquelle sur combien et passe de l’une à l’autre. Chaque côté a la sienne, vous pouvez donc laisser un mot marqué à gauche et en chercher un autre à droite. Elle respecte la casse, se limite aux mots entiers ou accepte une expression régulière.'
    },
    transfer: {
      h3: 'Copier d’un côté à l’autre',
      p: 'Les flèches de la bande centrale emportent un bloc en face. Pour moins que cela, sélectionnez le texte et ne transférez que ces lignes. Tout passe par l’historique d’édition et s’annule comme n’importe quelle autre modification.'
    },
    noFiles: {
      h3: 'Les fichiers sont facultatifs',
      p: 'Saisissez ou collez deux textes dans les panneaux : la comparaison fonctionne pareil. Le mélange aussi : un fichier d’un côté, du texte collé de l’autre.'
    },
    save: {
      h3: 'Enregistré tel quel',
      p: 'Chaque côté a son propre bouton d’enregistrement, et les fins de ligne et le BOM d’origine sont conservés. Modifier une ligne ne réécrit pas les mille autres.'
    },
    safeSave: {
      h3: 'Enregistrer n’écrase rien',
      p: 'Si le fichier a changé sur le disque depuis son ouverture, Cotejo n’écrit rien : il vous le dit et vous choisissez entre recharger ou enregistrer quand même. L’écriture passe par un fichier temporaire puis un renommage par-dessus, si bien qu’une coupure en plein enregistrement ne vous laisse jamais un fichier à moitié écrit.'
    },
    ignore: {
      h3: 'Ce que vous décidez d’ignorer',
      p: 'Espaces, majuscules, lignes vides et largeur de tabulation. Ce qui est ignoré passe en gris au lieu de disparaître, pour que vous sachiez que c’est toujours là.'
    }
  },

  folders: {
    eyebrow: 'Comparer des dossiers',
    h2: 'Deux arborescences face à face, avec les opérations là où il faut',
    lede:
      'Chaque entrée avec sa taille et sa date des deux côtés, alignées ligne à ligne. Là où quelque chose n’existe que d’un côté, l’espace hachuré du comparateur de texte tient la ligne d’en face.',
    tableCaption: 'Modes de comparaison de dossiers',
    colMode: 'Mode',
    colWhat: 'Ce qu’il compare',
    colWhen: 'Quand l’utiliser',
    quick: {
      name: 'Rapide',
      what: 'Taille et date, avec 2 s de tolérance',
      when: 'L’usage quotidien'
    },
    size: {
      name: 'Taille seule',
      what: 'Uniquement la taille',
      when: 'Les très gros balayages'
    },
    content: {
      name: 'Contenu',
      what: 'Hachage sha256 lu en flux',
      when: 'Quand on ne peut pas se fier à la date'
    },
    ops: {
      h3: 'Copier, déplacer, supprimer et synchroniser',
      p: 'Depuis le tableau lui-même, dans les deux sens. Toute action destructrice ou qui écrase demande confirmation en affichant d’abord combien de fichiers, combien d’octets et la liste de ce qui va être écrasé.'
    },
    trash: {
      h3: 'Les suppressions vont à la corbeille',
      p: 'Celle du système : Windows, macOS ou le bureau Linux en place. En cas d’erreur, on récupère là où on a l’habitude.'
    },
    filters: {
      h3: 'Des filtres qui comptent',
      pBefore:
        'Motifs d’inclusion et d’exclusion, et fichiers cachés en option. Exclure un dossier évite aussi de le parcourir : écarter ',
      pAfter: ' ne coûte pas de temps, cela en fait gagner.'
    },
    open: {
      h3: 'De l’arborescence au texte',
      p: 'Un double-clic sur un fichier différent l’ouvre comparé dans un nouvel onglet. Si cette comparaison était déjà ouverte, il y saute au lieu de la dupliquer.'
    },
    keyboard: {
      h3: 'Le tableau aussi au clavier',
      p: 'Flèches haut et bas pour se déplacer, droite et gauche pour ouvrir et fermer les dossiers, Origine et Fin pour les extrémités, Page préc. et Page suiv. pour sauter d’un écran, Espace pour ajouter à la sélection ou l’en retirer, et Entrée pour ouvrir la comparaison de cette ligne.'
    }
  },

  colors: {
    eyebrow: 'Comment le lire',
    h2: 'Chaud contre froid, pas rouge contre vert',
    lede:
      'Cela se distingue mieux avec les daltonismes les plus courants, et cela laisse au rouge une seule signification : ceci détruit quelque chose. Tous les textes respectent un contraste WCAG de 4.5:1, en thème clair comme en sombre.',
    tableCaption: 'Ce que signifie chaque couleur',
    colColor: 'Couleur',
    colMeaning: 'Signifie',
    amber: {
      name: 'Ambre',
      meaning:
        'La ligne existe des deux côtés mais a changé. Le mot précis est surligné à l’intérieur.'
    },
    teal: {
      name: 'Bleu-vert',
      meaning: 'La ligne n’existe que d’un côté. L’autre affiche un espace hachuré.'
    },
    gray: {
      name: 'Gris atténué',
      meaning:
        'Elles ne diffèrent que par quelque chose que vous avez demandé d’ignorer : espaces, majuscules ou lignes vides.'
    },
    red: {
      name: 'Rouge',
      meaning:
        'Uniquement dans les avertissements d’actions destructrices. Jamais un type de différence.'
    },
    violet: {
      name: 'Violet',
      meaning:
        'Ce que la recherche a trouvé. Ce n’est pas un type de différence : il se pose par-dessus la couleur de la ligne sans l’effacer.'
    }
  },

  downloads: {
    eyebrow: 'Téléchargements',
    h2: 'Télécharger Cotejo',
    lede:
      'Chaque système a une version qui s’installe et une qui s’exécute sans installation. Les deux contiennent la même application.',
    yourSystem: 'votre système',
    recommended: 'recommandé',
    releaseNotes: 'Notes de cette version',
    olderVersions: 'Versions précédentes',
    fallback:
      'Les liens directs n’ont pas pu être générés à la compilation de cette page. <a href="https://github.com/carlosalbertoxw/cotejo-file-comparison/releases">Téléchargez la dernière version depuis GitHub</a>, où se trouvent toujours tous les installeurs.',
    notes: {
      windows:
        'Windows prévient la première fois que l’éditeur est inconnu, parce que l’application n’est pas signée : Informations complémentaires → Exécuter quand même.',
      macos:
        'Sans signature Apple, macOS la bloque la première fois avec un avertissement qui ressemble à un fichier endommagé. Clic droit sur l’application → Ouvrir, et ensuite tout se passe normalement. macOS 13 Ventura ou ultérieur est requis.',
      linux:
        'L’AppImage a besoin du droit d’exécution la première fois, avec chmod +x, et s’ouvre ensuite d’un double-clic.'
    },
    items: {
      windowsInstaller: {
        label: 'Programme d’installation',
        detail: 'S’installe et crée son raccourci. Le choix habituel.'
      },
      windowsPortable: {
        label: 'Portable',
        detail: 'Un seul .exe qui s’exécute sans rien installer.'
      },
      macArm64Dmg: {
        label: 'Apple Silicon (.dmg)',
        detail: 'Mac avec puce M1 ou plus récente.'
      },
      macIntelDmg: {
        label: 'Intel (.dmg)',
        detail: 'Mac avec processeur Intel.'
      },
      macArm64Zip: {
        label: 'Apple Silicon (.zip)',
        detail: 'L’application seule, sans installeur.'
      },
      macIntelZip: {
        label: 'Intel (.zip)',
        detail: 'L’application seule, sans installeur.'
      },
      linuxDeb: {
        label: 'Debian / Ubuntu (.deb)',
        detail: 'S’installe avec le gestionnaire de paquets du système.'
      },
      linuxRpm: {
        label: 'Fedora / RHEL (.rpm)',
        detail: 'S’installe avec le gestionnaire de paquets du système.'
      },
      linuxAppImage: {
        label: 'AppImage',
        detail: 'Un seul fichier. Donnez-lui chmod +x et ouvrez-le.'
      }
    }
  },

  faq: {
    h2: 'Avant de l’installer',
    price: {
      q: 'Est-ce que ça coûte quelque chose ?',
      a: 'Non. C’est un logiciel libre sous licence MIT, sans version payante, sans compte et sans publicité. Le code est publié en entier.'
    },
    privacy: {
      q: 'Est-ce que mes fichiers partent quelque part ?',
      a: 'Non. Tout se passe sur votre machine. Sa seule connexion consiste à demander à GitHub une fois par jour s’il existe une version plus récente ; sans réseau, elle se tait et continue de fonctionner. On peut la désactiver dans « À propos ».'
    },
    updates: {
      q: 'Se met-elle à jour toute seule ?',
      a: 'Non : elle prévient et vous amène ici. Remplacer l’exécutable elle-même exigerait une application signée, donc des certificats payants. L’avis peut être fermé et ne revient pas pour cette même version.'
    },
    languages: {
      q: 'Dans quelles langues est-elle ?',
      a: 'Espagnol, anglais, français et portugais du Brésil. Elle prend celle du système au premier lancement et se change à tout moment. Les dates et les tailles suivent la langue active.'
    },
    large: {
      q: 'Tient-elle le coup avec de gros fichiers ?',
      a: 'La comparaison tourne hors du fil de l’interface : la fenêtre reste réactive pendant le calcul. Pour les dossiers, il n’y a pas de limite de taille : le mode contenu lit les fichiers en flux, et comparer deux images disque coûte autant de mémoire que comparer deux notes. Un fichier texte s’ouvre jusqu’à 12 Mo, ce que l’application tient vraiment ; au-delà, elle le dit au lieu d’essayer et de manquer de mémoire.'
    },
    encoding: {
      q: 'Et les fichiers qui ne sont pas en UTF-8 ?',
      a: 'Ils s’ouvrent en lecture seule : on les compare normalement, mais on ne peut pas les modifier. Lire un vieux .txt en Windows-1252 fait perdre ses lettres accentuées, et l’enregistrer par-dessus écrirait cette perte sur le disque. Un bandeau le signale à l’ouverture.'
    },
    bugs: {
      q: 'Comment signaler un problème ?',
      a: 'Dans <a href="https://github.com/carlosalbertoxw/cotejo-file-comparison/issues">les issues du dépôt</a>. Dites ce que vous avez fait, ce que vous attendiez et ce qui s’est passé ; cela suffit en général.'
    }
  },

  footer: {
    license: 'MIT © {year} Carlos Alberto',
    source: 'Code source',
    allVersions: 'Toutes les versions',
    report: 'Signaler un problème'
  }
}
