import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Localization from 'expo-localization';
import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';

import en from './locales/en.json';
import fr from './locales/fr.json';
import nl from './locales/nl.json';
import { trackLanguageChange } from '../services/analytics';

export const LANGUAGE_STORAGE_KEY = 'bxconnect_mobile_lang';
export const SUPPORTED_LANGUAGES = ['fr', 'nl', 'en'];

const resources = {
  fr: { translation: fr },
  nl: { translation: nl },
  en: { translation: en },
};

function normalizeLanguage(language) {
  const code = language?.toLowerCase().split('-')[0];
  return SUPPORTED_LANGUAGES.includes(code) ? code : null;
}

export async function detectInitialLanguage() {
  const storedLanguage = normalizeLanguage(await AsyncStorage.getItem(LANGUAGE_STORAGE_KEY));
  if (storedLanguage) return storedLanguage;

  const locale = Localization.getLocales?.()[0];
  return normalizeLanguage(locale?.languageCode || locale?.languageTag) || 'fr';
}

const languageDetector = {
  type: 'languageDetector',
  async: true,
  init: () => {},
  detect: async (callback) => {
    callback(await detectInitialLanguage());
  },
  cacheUserLanguage: async (language) => {
    const normalizedLanguage = normalizeLanguage(language);
    if (normalizedLanguage) {
      await AsyncStorage.setItem(LANGUAGE_STORAGE_KEY, normalizedLanguage);
    }
  },
};

i18n
  .use(languageDetector)
  .use(initReactI18next)
  .init({
    resources,
    fallbackLng: 'fr',
    supportedLngs: SUPPORTED_LANGUAGES,
    compatibilityJSON: 'v4',
    interpolation: {
      escapeValue: false,
    },
    react: {
      useSuspense: false,
    },
  });

export async function changeAppLanguage(language) {
  const normalizedLanguage = normalizeLanguage(language);
  if (!normalizedLanguage) return;

  await i18n.changeLanguage(normalizedLanguage);
  await AsyncStorage.setItem(LANGUAGE_STORAGE_KEY, normalizedLanguage);
  trackLanguageChange(normalizedLanguage);
}

export default i18n;
