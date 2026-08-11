// Enlaces publicos de Cotejo. Aqui y en ningun otro sitio: la pagina de
// «Acerca de», el aviso de nueva version y el proceso principal apuntan todos
// al mismo repositorio.

export const REPO_URL = 'https://github.com/carlosalbertoxw/cotejo-file-comparison'

/** Donde se descargan los instalables. Es el destino del aviso de version. */
export const RELEASES_URL = `${REPO_URL}/releases`

export const ISSUES_URL = `${REPO_URL}/issues`

/** La API contesta con la ultima release publicada, sin borradores. */
export const LATEST_RELEASE_API =
  'https://api.github.com/repos/carlosalbertoxw/cotejo-file-comparison/releases/latest'
