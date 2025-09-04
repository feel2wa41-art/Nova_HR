import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Localization from 'expo-localization';

import enTranslation from './locales/en.json';
import koTranslation from './locales/ko.json';

const resources = {
  en: {
    translation: enTranslation
  },
  ko: {
    translation: koTranslation
  }
};

// Get stored language preference
const getStoredLanguage = async () => {
  try {
    const stored = await AsyncStorage.getItem('language');
    if (stored) return stored;
    
    // Check user profile language preference
    const userData = await AsyncStorage.getItem('user');
    if (userData) {
      const user = JSON.parse(userData);
      if (user?.language) return user.language;
    }
    
    // Get device language
    const deviceLang = Localization.locale.split('-')[0];
    return deviceLang === 'ko' ? 'ko' : 'en';
  } catch {
    return 'en'; // Default to English
  }
};

// Initialize i18n
const initI18n = async () => {
  const language = await getStoredLanguage();
  
  await i18n
    .use(initReactI18next)
    .init({
      resources,
      lng: language,
      fallbackLng: 'en',
      interpolation: {
        escapeValue: false
      },
      compatibilityJSON: 'v3'
    });
};

// Update language and save to storage
export const changeLanguage = async (language: 'ko' | 'en') => {
  await AsyncStorage.setItem('language', language);
  await i18n.changeLanguage(language);
};

// Update language from user profile data
export const updateLanguageFromUser = async (user: any) => {
  if (user?.language && user.language !== i18n.language) {
    await changeLanguage(user.language);
  }
};

// Initialize on app start
initI18n();

export default i18n;