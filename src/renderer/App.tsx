import { useCallback, useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { hasPrimaryModifier } from './platform'
import { hasUnsavedWork, useSession, type Tab } from './state/sessionStore'
import { saveTab } from './state/tabSavers'
import { useUpdates } from './state/updateStore'
import { TabBar } from './components/common/TabBar'
import { TextCompareView } from './components/text/TextCompareView'
import { DirCompareView } from './components/dir/DirCompareView'
import { WelcomeView } from './components/common/WelcomeView'
import { AboutDialog } from './components/common/AboutDialog'
import { UpdateBanner } from './components/common/UpdateBanner'
import { ConfirmDialog } from './components/common/ConfirmDialog'

export function App(): React.JSX.Element {
  const { t } = useTranslation()
  const tabs = useSession((state) => state.tabs)
  const activeId = useSession((state) => state.activeId)
  const openTab = useSession((state) => state.openTab)
  const closeTab = useSession((state) => state.closeTab)
  const [aboutOpen, setAboutOpen] = useState(false)
  /** Pestana con trabajo sin guardar que se ha pedido cerrar. */
  const [closing, setClosing] = useState<string | null>(null)

  /**
   * Cerrar una pestana, preguntando antes si se perderia algo.
   *
   * Antes se cerraba sin mirar el ●: un Ctrl+W de mas tiraba las ediciones.
   * La pestana se trae al frente para que, si guardar choca con un cambio en
   * el disco o falla, el dialogo o el error salgan a la vista.
   */
  const requestClose = useCallback(
    (id: string): void => {
      const tab = useSession.getState().tabs.find((item) => item.id === id)
      if (!tab) return
      if (!hasUnsavedWork(tab)) {
        closeTab(id)
        return
      }
      useSession.getState().setActive(id)
      setClosing(id)
    },
    [closeTab]
  )

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
      // En minusculas, como Ctrl+S: con Bloq Mayus la tecla llega como «W».
      const key = event.key.toLowerCase()
      if (key === 't') {
        event.preventDefault()
        openTab('text')
      }
      if (key === 'w') {
        event.preventDefault()
        const current = useSession.getState().activeId
        if (current) requestClose(current)
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
  }, [openTab, requestClose])

  /**
   * Lo mismo al cerrar la ventana o salir: el proceso principal pregunta con
   * un dialogo nativo, y necesita saber si hay algo que perder y con que
   * palabras decirlo en el idioma de la interfaz.
   */
  const unsavedCount = tabs.filter(hasUnsavedWork).length
  useEffect(() => {
    void window.api.setCloseGuard(
      unsavedCount === 0
        ? null
        : {
            title: 'Cotejo',
            message: t('unsaved.windowMessage'),
            detail: t('unsaved.windowDetail', { count: unsavedCount }),
            discard: t('unsaved.windowDiscard'),
            cancel: t('common.cancel')
          }
    )
  }, [unsavedCount, t])

  const closingTab = tabs.find((tab) => tab.id === closing)

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
      <TabBar onShowAbout={() => setAboutOpen(true)} onClose={requestClose} />
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
      {closingTab && (
        <CloseTabDialog
          tab={closingTab}
          onCancel={() => setClosing(null)}
          onDiscard={() => {
            setClosing(null)
            closeTab(closingTab.id)
          }}
          onSave={async () => {
            setClosing(null)
            if (await saveTab(closingTab.id)) closeTab(closingTab.id)
          }}
        />
      )}
    </div>
  )
}

function CloseTabDialog({
  tab,
  onCancel,
  onDiscard,
  onSave
}: {
  tab: Tab
  onCancel: () => void
  onDiscard: () => void
  onSave: () => Promise<void>
}): React.JSX.Element {
  const { t } = useTranslation()
  const title =
    tab.title || t(tab.kind === 'text' ? 'tabs.defaultTitleText' : 'tabs.defaultTitleDir')
  const message = tab.dirty
    ? t(tab.scratch ? 'unsaved.closeTabBoth' : 'unsaved.closeTabDirty')
    : t('unsaved.closeTabScratch')

  // Sin archivos modificados no hay nada que guardar: el texto suelto no
  // tiene donde ir, y la unica salida, aparte de cancelar, es perderlo.
  if (!tab.dirty) {
    return (
      <ConfirmDialog
        title={t('unsaved.closeTabTitle', { title })}
        message={<p>{message}</p>}
        danger
        confirmLabel={t('unsaved.discardAndClose')}
        onCancel={onCancel}
        onConfirm={onDiscard}
      />
    )
  }
  return (
    <ConfirmDialog
      title={t('unsaved.closeTabTitle', { title })}
      message={<p>{message}</p>}
      confirmLabel={t('unsaved.saveAndClose')}
      alternative={{ label: t('unsaved.discardAndClose'), onClick: onDiscard }}
      onCancel={onCancel}
      onConfirm={() => void onSave()}
    />
  )
}
