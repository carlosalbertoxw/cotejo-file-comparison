import { useTranslation } from 'react-i18next'
import type { Find } from './useFind'

interface Props {
  find: Find
  /** Para lectores de pantalla: en que panel se esta buscando. */
  label: string
}

/**
 * La caja de busqueda de un panel, flotando sobre su esquina superior derecha.
 *
 * Va superpuesta y no empotrada en la columna a proposito: los dos paneles
 * miden lo mismo linea a linea, y una barra que ocupara sitio en uno solo
 * desplazaria sus lineas respecto a las del otro.
 */
export function FindBar({ find, label }: Props): React.JSX.Element {
  const { t } = useTranslation()
  const { options } = find

  const empty = find.query !== '' && !find.invalid && find.matchCount === 0
  const counter = find.invalid
    ? '!'
    : find.query === ''
      ? ''
      : `${find.current + 1}/${find.matchCount}${find.truncated ? '+' : ''}`

  return (
    <div className="find-bar" role="search">
      <input
        type="text"
        ref={find.inputRef}
        className={find.invalid || empty ? 'no-match' : undefined}
        value={find.query}
        aria-label={label}
        placeholder={t('textDiff.find.placeholder')}
        spellCheck={false}
        onChange={(event) => find.setQuery(event.target.value)}
        onKeyDown={(event) => {
          if (event.key !== 'Enter') return
          event.preventDefault()
          if (event.shiftKey) find.goPrev()
          else find.goNext()
        }}
      />

      <span
        className={find.invalid || empty ? 'find-count none' : 'find-count'}
        title={find.invalid ? t('textDiff.find.badRegex') : undefined}
      >
        {counter}
      </span>

      {/* Las etiquetas son simbolos, no palabras: no se traducen, se explican
          en el tooltip. */}
      <button
        className="find-toggle"
        aria-pressed={options.matchCase}
        title={t('textDiff.find.matchCaseTooltip')}
        onClick={() => find.setOption('matchCase', !options.matchCase)}
      >
        Aa
      </button>
      <button
        className="find-toggle"
        aria-pressed={options.wholeWord}
        title={t('textDiff.find.wholeWordTooltip')}
        onClick={() => find.setOption('wholeWord', !options.wholeWord)}
      >
        |ab|
      </button>
      <button
        className="find-toggle"
        aria-pressed={options.regex}
        title={t('textDiff.find.regexTooltip')}
        onClick={() => find.setOption('regex', !options.regex)}
      >
        .*
      </button>

      <button
        className="find-step"
        disabled={find.matchCount === 0}
        title={t('textDiff.find.prevTooltip')}
        onClick={find.goPrev}
      >
        ▲
      </button>
      <button
        className="find-step"
        disabled={find.matchCount === 0}
        title={t('textDiff.find.nextTooltip')}
        onClick={find.goNext}
      >
        ▼
      </button>
      <button className="find-step" title={t('textDiff.find.closeTooltip')} onClick={find.close}>
        ✕
      </button>
    </div>
  )
}
