import type { Catalog } from './index'

export const en: Catalog = {
  meta: {
    title: 'Cotejo — compare text files and folders side by side',
    description:
      'Free desktop app for Windows, macOS and Linux. Compare two text files or two whole folders, edit both sides and copy changes from one to the other.'
  },

  nav: {
    skip: 'Skip to content',
    text: 'Text',
    folders: 'Folders',
    colors: 'Colours',
    downloads: 'Downloads',
    github: 'GitHub',
    language: 'Language',
    main: 'Main'
  },

  hero: {
    lede:
      'Cotejo compares <strong>text files</strong> and <strong>whole folders</strong>. It shows them facing each other line by line, lets you edit both sides and copy changes from one to the other. For Windows, macOS and Linux.',
    download: 'Download Cotejo',
    source: 'View the code',
    latestVersion: 'Latest version',
    freeSoftware: 'Free software',
    license: 'Free, MIT licensed',
    privacy: 'No account, no ads, no telemetry'
  },

  preview: {
    tab: 'report.txt ↔ report.txt',
    versions: 'June · July',
    alt:
      'Two versions of a text file compared: line 3 changes from 1,240 to 1,310 units, the line "Region: north" is only on the left and "Reviewed by: Luis" only on the right.',
    caption:
      'Amber: the line exists on both sides but changed, with the specific word highlighted inside it. Teal: the line is only on one side, and a hatched gap holds its place opposite so the two columns never drift apart. The arrows in the middle strip copy that difference to the other side.',
    doc: {
      title: 'Quarterly report',
      salesPre: 'Sales: ',
      salesOld: '1,240',
      salesNew: '1,310',
      salesPost: ' units',
      returns: 'Returns: 38',
      region: 'Region: north',
      owner: 'Owner: Ana',
      closing: 'Closing: 30 June',
      reviewer: 'Reviewed by: Luis'
    }
  },

  text: {
    eyebrow: 'Comparing text',
    h2: 'See the difference and fix it right there',
    lede: 'Both panes are editable. No need to open another program to apply what you just saw.',
    aligned: {
      h3: 'Never out of step',
      p: 'Matched lines sit opposite each other and gaps take up their space, so both panes are exactly the same height and never fall out of sync as you scroll.'
    },
    inline: {
      h3: 'The exact word that changed',
      p: 'Inside a modified line, only the part that differs is highlighted, not the whole line. A side map summarises the entire file and jumps to any difference with one click.'
    },
    transfer: {
      h3: 'Copy from one side to the other',
      p: 'The arrows in the middle strip carry a block across. If you want less than that, select the text and transfer just those lines. It all goes through the edit history, so it undoes like any other change.'
    },
    noFiles: {
      h3: 'Files optional',
      p: 'Type or paste two pieces of text into the panes and they compare just the same. Mixing works too: a file on one side, something pasted on the other.'
    },
    save: {
      h3: 'Saved the way it was',
      p: 'Each side has its own save button, and the original line endings and BOM are preserved. Editing one line does not rewrite the other thousand.'
    },
    safeSave: {
      h3: 'Saving overwrites nothing',
      p: 'If the file changed on disk since you opened it, Cotejo writes nothing: it tells you, and you choose between reloading or saving anyway. The write goes through a temporary file and a rename on top, so an interruption halfway through never leaves you half a file.'
    },
    ignore: {
      h3: 'Whatever you choose to ignore',
      p: 'Whitespace, letter case, blank lines and tab width. Ignored differences turn grey instead of disappearing, so you know they are still there.'
    }
  },

  folders: {
    eyebrow: 'Comparing folders',
    h2: 'Two trees facing each other, with the operations where you need them',
    lede:
      'Every entry with its size and date on both sides, aligned row by row. Where something exists on one side only, the same hatched gap you get in the text comparison holds the opposite row.',
    tableCaption: 'Folder comparison modes',
    colMode: 'Mode',
    colWhat: 'What it compares',
    colWhen: 'When to use it',
    quick: {
      name: 'Quick',
      what: 'Size and date, with 2 s of tolerance',
      when: 'Everyday use'
    },
    size: {
      name: 'Size only',
      what: 'Size and nothing else',
      when: 'Very large sweeps'
    },
    content: {
      name: 'Content',
      what: 'sha256 hash read as a stream',
      when: 'When the date cannot be trusted'
    },
    ops: {
      h3: 'Copy, move, delete and sync',
      p: 'From the table itself, in either direction. Anything destructive or overwriting asks for confirmation first, showing how many files, how many bytes, and the list of what is about to be overwritten.'
    },
    trash: {
      h3: 'Deletions go to the recycle bin',
      p: 'The system one: Windows, macOS or whichever Linux desktop you are on. If you get it wrong, you recover it from the usual place.'
    },
    filters: {
      h3: 'Filters that pull their weight',
      pBefore:
        'Include and exclude patterns, plus optional hidden files. Excluding a folder also skips walking it, so ruling out ',
      pAfter: ' costs no time: it saves it.'
    },
    open: {
      h3: 'From the tree into the text',
      p: 'Double-click a differing file and it opens compared in a new tab. If that comparison was already open, it jumps there instead of duplicating it.'
    },
    keyboard: {
      h3: 'The table, from the keyboard too',
      p: 'Up and down arrows to move, right and left to open and close folders, Home and End for the ends, Page Up and Page Down to jump a screen, Space to add to or remove from the selection, and Enter to open that row compared.'
    }
  },

  colors: {
    eyebrow: 'How to read it',
    h2: 'Warm against cool, not red against green',
    lede:
      'It reads better with the most common forms of colour blindness, and it leaves red to mean one thing only: this destroys something. Every text meets a WCAG contrast of 4.5:1, in both light and dark themes.',
    tableCaption: 'What each colour means',
    colColor: 'Colour',
    colMeaning: 'Means',
    amber: {
      name: 'Amber',
      meaning: 'The line exists on both sides but changed. The specific word is highlighted inside.'
    },
    teal: {
      name: 'Teal',
      meaning: 'The line exists on one side only. The other shows a hatched gap.'
    },
    gray: {
      name: 'Dimmed grey',
      meaning: 'They differ only in something you asked to ignore: whitespace, case or blank lines.'
    },
    red: {
      name: 'Red',
      meaning: 'Only in warnings about destructive actions. Never a kind of difference.'
    }
  },

  downloads: {
    eyebrow: 'Downloads',
    h2: 'Download Cotejo',
    lede:
      'Each system has one version that installs and one that runs without installing. Both carry the same app inside.',
    yourSystem: 'your system',
    recommended: 'recommended',
    releaseNotes: 'Release notes',
    olderVersions: 'Earlier versions',
    fallback:
      'Direct links could not be generated when this page was built. <a href="https://github.com/carlosalbertoxw/cotejo-file-comparison/releases">Download the latest version from GitHub</a>, where every installer always lives.',
    notes: {
      windows:
        'Windows warns the first time that the publisher is unknown, because the app is not signed: More info → Run anyway.',
      macos:
        'Without an Apple signature, macOS blocks it the first time with a warning that looks like a damaged file. Right-click the app → Open, and from then on it behaves normally.',
      linux:
        'The AppImage needs execute permission the first time, with chmod +x, and then it opens with a double click.'
    },
    items: {
      windowsInstaller: {
        label: 'Installer',
        detail: 'Installs and creates its shortcut. The usual choice.'
      },
      windowsPortable: {
        label: 'Portable',
        detail: 'A single .exe that runs without installing anything.'
      },
      macArm64Dmg: {
        label: 'Apple Silicon (.dmg)',
        detail: 'Mac with an M1 chip or newer.'
      },
      macIntelDmg: {
        label: 'Intel (.dmg)',
        detail: 'Mac with an Intel processor.'
      },
      macArm64Zip: {
        label: 'Apple Silicon (.zip)',
        detail: 'The app on its own, no installer.'
      },
      macIntelZip: {
        label: 'Intel (.zip)',
        detail: 'The app on its own, no installer.'
      },
      linuxDeb: {
        label: 'Debian / Ubuntu (.deb)',
        detail: 'Installs through the system package manager.'
      },
      linuxRpm: {
        label: 'Fedora / RHEL (.rpm)',
        detail: 'Installs through the system package manager.'
      },
      linuxAppImage: {
        label: 'AppImage',
        detail: 'A single file. Give it chmod +x and open it.'
      }
    }
  },

  faq: {
    h2: 'Before you install it',
    price: {
      q: 'Does it cost anything?',
      a: 'No. It is free software under the MIT licence, with no paid tier, no account and no ads. The whole source is published.'
    },
    privacy: {
      q: 'Does it send my files anywhere?',
      a: 'No. Everything happens on your machine. Its only connection is asking GitHub once a day whether a newer version exists, and with no network it stays quiet and keeps working.'
    },
    updates: {
      q: 'Does it update itself?',
      a: 'No: it tells you and brings you here. Replacing the executable on its own would require a signed app, and that means paid certificates. The notice can be dismissed and will not come back for that same version.'
    },
    languages: {
      q: 'What languages does it speak?',
      a: 'Spanish, English, French and Brazilian Portuguese. It picks up the system language on first run and can be changed at any time. Dates and sizes follow the active language.'
    },
    large: {
      q: 'Can it handle large files?',
      a: 'The comparison runs off the interface thread, so the window stays responsive while it works. Folders have no size limit: content mode reads files as a stream, and comparing two disk images costs the same memory as comparing two notes. A text file opens up to 12 MB, which is what the app really holds; beyond that it says so instead of trying and running out of memory.'
    },
    encoding: {
      q: 'What about files that are not UTF-8?',
      a: 'They open read-only: you can compare them as usual, but not edit them. Reading a legacy Windows-1252 .txt loses its accented letters, and saving over it would write that loss to disk. A banner says so when you open it.'
    },
    bugs: {
      q: 'How do I report a bug?',
      a: 'On <a href="https://github.com/carlosalbertoxw/cotejo-file-comparison/issues">the repository issues</a>. Say what you did, what you expected and what happened; that is usually enough.'
    }
  },

  footer: {
    license: 'MIT © {year} Carlos Alberto',
    source: 'Source code',
    allVersions: 'All versions',
    report: 'Report a problem'
  }
}
