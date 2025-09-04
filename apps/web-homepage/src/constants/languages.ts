// Global Language Configuration for Nova HR System

export const SUPPORTED_LANGUAGES = {
  ko: {
    code: 'ko',
    name: 'Korean',
    nativeName: '한국어',
    flag: '🇰🇷',
    rtl: false,
    dateFormat: 'YYYY-MM-DD',
    numberFormat: 'ko-KR',
    currency: 'KRW',
    timezone: 'Asia/Seoul',
  },
  en: {
    code: 'en',
    name: 'English',
    nativeName: 'English',
    flag: '🇺🇸',
    rtl: false,
    dateFormat: 'MM/DD/YYYY',
    numberFormat: 'en-US',
    currency: 'USD',
    timezone: 'America/New_York',
  },
  id: {
    code: 'id',
    name: 'Indonesian',
    nativeName: 'Bahasa Indonesia',
    flag: '🇮🇩',
    rtl: false,
    dateFormat: 'DD/MM/YYYY',
    numberFormat: 'id-ID',
    currency: 'IDR',
    timezone: 'Asia/Jakarta',
  },
  zh: {
    code: 'zh',
    name: 'Chinese',
    nativeName: '中文',
    flag: '🇨🇳',
    rtl: false,
    dateFormat: 'YYYY-MM-DD',
    numberFormat: 'zh-CN',
    currency: 'CNY',
    timezone: 'Asia/Shanghai',
  },
  ja: {
    code: 'ja',
    name: 'Japanese',
    nativeName: '日本語',
    flag: '🇯🇵',
    rtl: false,
    dateFormat: 'YYYY-MM-DD',
    numberFormat: 'ja-JP',
    currency: 'JPY',
    timezone: 'Asia/Tokyo',
  },
} as const;

export type LanguageCode = keyof typeof SUPPORTED_LANGUAGES;
export type LanguageInfo = typeof SUPPORTED_LANGUAGES[LanguageCode];

export const DEFAULT_LANGUAGE: LanguageCode = 'en';

export const getLanguageInfo = (code: string): LanguageInfo | null => {
  return SUPPORTED_LANGUAGES[code as LanguageCode] || null;
};

export const isValidLanguageCode = (code: string): code is LanguageCode => {
  return code in SUPPORTED_LANGUAGES;
};

export const getLanguageOptions = () => {
  return Object.values(SUPPORTED_LANGUAGES).map(lang => ({
    value: lang.code,
    label: lang.nativeName,
    flag: lang.flag,
    name: lang.name,
  }));
};