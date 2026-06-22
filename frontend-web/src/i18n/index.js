import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import LanguageDetector from 'i18next-browser-languagedetector';

import fr from './locales/fr.json';
import nl from './locales/nl.json';
import en from './locales/en.json';
import { trackLanguageChange } from '../monitoring/analytics';

i18n
  .use(LanguageDetector)
  .use(initReactI18next)
  .init({
    resources: {
      fr: { translation: fr },
      nl: { translation: nl },
      en: { translation: en },
    },
    fallbackLng: 'fr',
    supportedLngs: ['fr', 'nl', 'en'],
    detection: {
      // Ordre de détection : localStorage d'abord, puis navigateur
      order: ['localStorage', 'navigator'],
      lookupLocalStorage: 'bxconnect_lang',
      cacheUserLanguage: true,
    },
    interpolation: {
      escapeValue: false, // React gère déjà l'échappement XSS
    },
  });

i18n.on('languageChanged', (language) => {
  trackLanguageChange(language);
});

export default i18n;
