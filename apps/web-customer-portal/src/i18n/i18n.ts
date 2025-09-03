import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import LanguageDetector from 'i18next-browser-languagedetector';
import enTranslation from './locales/en.json';
import koTranslation from './locales/ko.json';
import idTranslation from './locales/id.json';
import { DEFAULT_LANGUAGE, LanguageCode } from '../constants/languages';

// Get stored language preference or default to DEFAULT_LANGUAGE
const getStoredLanguage = (): LanguageCode => {
  const stored = localStorage.getItem('i18nextLng') || localStorage.getItem('language');
  const tenant = JSON.parse(localStorage.getItem('tenant') || '{}');
  // 명시적으로 한국어를 기본값으로 설정
  return stored || tenant?.settings?.language || 'ko';
};

const resources = {
  en: {
    translation: enTranslation
  },
  ko: {
    translation: koTranslation
  },
  id: {
    translation: idTranslation
  }
};

i18n
  .use(LanguageDetector)
  .use(initReactI18next)
  .init({
    resources,
    lng: getStoredLanguage(),
    fallbackLng: 'ko', // 한국어를 기본 폴백 언어로 설정
    debug: false,
    interpolation: {
      escapeValue: false
    },
    detection: {
      order: ['localStorage', 'querystring', 'navigator'],
      caches: ['localStorage'],
      lookupLocalStorage: 'language' // localStorage 키 명시
    }
  });

// Listen for language changes from API
export const updateLanguageFromAPI = (language: LanguageCode) => {
  i18n.changeLanguage(language);
  localStorage.setItem('language', language);
};

export default i18n;