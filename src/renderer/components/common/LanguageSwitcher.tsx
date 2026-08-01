import { useTranslation } from 'react-i18next'
import { useSettings } from '../../state/settingsStore'
import { LANGUAGES, type Language } from '../../i18n/detect'

// Endonimos a proposito: el nombre de cada idioma no se traduce.
const LABELS: Record<Language, string> = {
  es: 'Español',
  en: 'English',
  fr: 'Français',
  pt: 'Português'
}

export function LanguageSwitcher(): React.JSX.Element {
  const { t } = useTranslation()
  const language = useSettings((state) => state.language)
  const setLanguage = useSettings((state) => state.setLanguage)

  return (
    <label className="language-switcher" title={t('language.label')}>
      <span aria-hidden="true">🌐</span>
      <select
        value={language}
        aria-label={t('language.label')}
        onChange={(event) => setLanguage(event.target.value as Language)}
      >
        {LANGUAGES.map((code) => (
          <option key={code} value={code}>
            {LABELS[code]}
          </option>
        ))}
      </select>
    </label>
  )
}
