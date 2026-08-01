import i18n from 'i18next'
import { initReactI18next } from 'react-i18next'
import { useSettings } from '../state/settingsStore'
import type { Language } from './detect'
import es from './locales/es.json'
import en from './locales/en.json'
import fr from './locales/fr.json'
import pt from './locales/pt.json'

const initial = useSettings.getState().language

void i18n.use(initReactI18next).init({
  resources: {
    es: { translation: es },
    en: { translation: en },
    fr: { translation: fr },
    pt: { translation: pt }
  },
  lng: initial,
  fallbackLng: 'es',
  interpolation: { escapeValue: false }
})

function applyLanguage(language: Language): void {
  void i18n.changeLanguage(language)
  document.documentElement.lang = language
}

document.documentElement.lang = initial

useSettings.subscribe((state, previous) => {
  if (state.language !== previous.language) applyLanguage(state.language)
})

export default i18n
