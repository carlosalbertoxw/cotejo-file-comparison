import { useCallback, useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { hasPrimaryModifier } from './platform'
import { useSession } from './state/sessionStore'
import { useUpdates } from './state/updateStore'
import { TabBar } from './components/common/TabBar'
import { TextCompareView } from './components/text/TextCompareView'
import { DirCompareView } from './components/dir/DirCompareView'
import { WelcomeView } from './components/common/WelcomeView'
import { AboutDialog } from './components/common/AboutDialog'
import { UpdateBanner } from './components/common/UpdateBanner'

export function App(): React.JSX.Element {
  const { t } = useTranslation()
  const tabs = useSession((state) => state.tabs)
  const activeId = useSession((state) => state.activeId)
  const openTab = useSession((state) => state.openTab)
  const closeTab = useSession((state) => state.closeTab)
  const [aboutOpen, setAboutOpen] = useState(false)

  /**
   * Abre una o dos rutas en la pestana que corresponda. Dos carpetas abren una
   * comparacion de directorios; cualquier otra combinacion, una de texto.
   */
  const openPaths = useCallback(
    async (paths: string[]): Promise<void> => {
      if (paths.length === 0) return
      const stats = await Promise.all(
        paths.slice(0, 2).map(async (path) => {
          try {
            return { path, isDir: (await window.api.statPath(path)).isDir }
          } catch {
            return { path, isDir: false }
          }
        })
      )
      const kind = stats.every((entry) => entry.isDir) ? 'dir' : 'text'
      openTab(kind, stats[0]?.path ?? null, stats[1]?.path ?? null)
    },
    [openTab]
  )

  useEffect(() => {
    return window.api.onOpenPaths((paths) => void openPaths(paths))
  }, [openPaths])

  // El propio store decide si toca preguntar o si la ultima consulta es
  // reciente, asi que arrancar la comprobacion en cada montaje no cuesta nada.
  useEffect(() => {
    void useUpdates.getState().check()
  }, [])

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent): void => {
      if (!hasPrimaryModifier(event)) return
      if (event.key === 't') {
        event.preventDefault()
        openTab('text')
      }
      if (event.key === 'w') {
        event.preventDefault()
        const current = useSession.getState().activeId
        if (current) closeTab(current)
      }
      if (event.key === 'Tab') {
        event.preventDefault()
        const { tabs: list, activeId: current, setActive } = useSession.getState()
        if (list.length < 2) return
        const index = list.findIndex((tab) => tab.id === current)
        const step = event.shiftKey ? -1 : 1
        const next = list[(index + step + list.length) % list.length]
        if (next) setActive(next.id)
      }
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [openTab, closeTab])

  // El titulo de la ventana sigue a la pestana activa, como en cualquier editor.
  useEffect(() => {
    const active = tabs.find((tab) => tab.id === activeId)
    const title =
      active &&
      (active.title ||
        t(active.kind === 'text' ? 'tabs.defaultTitleText' : 'tabs.defaultTitleDir'))
    document.title = title ? `${title} — Cotejo` : 'Cotejo'
  }, [tabs, activeId, t])

  const onDrop = useCallback(
    (event: React.DragEvent): void => {
      event.preventDefault()
      const paths = [...event.dataTransfer.files].map((file) => window.api.getPathForFile(file))
      if (paths.length > 0) void openPaths(paths)
    },
    [openPaths]
  )

  return (
    <div
      className="app"
      onDragOver={(event) => {
        event.preventDefault()
        event.dataTransfer.dropEffect = 'copy'
      }}
      onDrop={onDrop}
    >
      <UpdateBanner />
      <TabBar onShowAbout={() => setAboutOpen(true)} />
      <div className="tab-panels">
        {tabs.length === 0 && <WelcomeView onShowAbout={() => setAboutOpen(true)} />}
        {/* Las pestanas inactivas se ocultan en vez de desmontarse: asi conservan
            su scroll, su seleccion y sus cambios sin guardar. */}
        {tabs.map((tab) => (
          <div key={tab.id} className="tab-panel" hidden={tab.id !== activeId}>
            {tab.kind === 'text' ? (
              <TextCompareView tabId={tab.id} active={tab.id === activeId} />
            ) : (
              <DirCompareView tabId={tab.id} active={tab.id === activeId} />
            )}
          </div>
        ))}
      </div>
      {aboutOpen && <AboutDialog onClose={() => setAboutOpen(false)} />}
    </div>
  )
}
