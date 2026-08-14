import { useTranslation } from 'react-i18next'
import { useHistory, type HistoryEntry } from '../../state/historyStore'
import { titleFor, useSession } from '../../state/sessionStore'

/**
 * Las ultimas comparaciones, para repetirlas de un clic.
 *
 * Guarda rutas, no contenido: al abrir una entrada se relee del disco, igual
 * que al restaurar una pestana. Si el archivo ya no esta, la comparacion se
 * abre y muestra el error de lectura como en cualquier otro caso.
 */
export function HistoryList(): React.JSX.Element | null {
  const { t } = useTranslation()
  const entries = useHistory((state) => state.entries)
  const remove = useHistory((state) => state.remove)
  const clear = useHistory((state) => state.clear)
  const openTab = useSession((state) => state.openTab)

  if (entries.length === 0) return null

  const keyOf = (entry: HistoryEntry): string =>
    `${entry.kind} ${entry.leftPath} ${entry.rightPath}`

  return (
    <div className="history">
      <div className="history-head">
        <span>{t('history.title')}</span>
        <button className="link-button" onClick={clear}>
          {t('history.clear')}
        </button>
      </div>

      <ul>
        {entries.map((entry) => (
          <li key={keyOf(entry)}>
            <button
              className="history-entry"
              title={`${entry.leftPath}\n${entry.rightPath}`}
              onClick={() => openTab(entry.kind, entry.leftPath, entry.rightPath)}
            >
              <span aria-hidden="true">{entry.kind === 'text' ? '≡' : '🗀'}</span>
              <span className="history-title">
                {titleFor(entry.leftPath, entry.rightPath)}
              </span>
              <span className="history-paths">
                {entry.leftPath} ↔ {entry.rightPath}
              </span>
            </button>
            <button
              className="history-remove"
              title={t('history.remove')}
              onClick={() => remove(entry)}
            >
              ✕
            </button>
          </li>
        ))}
      </ul>
    </div>
  )
}
