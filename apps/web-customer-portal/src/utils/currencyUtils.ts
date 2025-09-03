/**
 * Currency formatting utilities with locale support
 */

export const SUPPORTED_CURRENCIES = {
  KRW: { symbol: '₩', locale: 'ko-KR', name: 'Korean Won' },
  USD: { symbol: '$', locale: 'en-US', name: 'US Dollar' },
  EUR: { symbol: '€', locale: 'de-DE', name: 'Euro' },
  JPY: { symbol: '¥', locale: 'ja-JP', name: 'Japanese Yen' },
  CNY: { symbol: '¥', locale: 'zh-CN', name: 'Chinese Yuan' },
  GBP: { symbol: '£', locale: 'en-GB', name: 'British Pound' },
  IDR: { symbol: 'Rp', locale: 'id-ID', name: 'Indonesian Rupiah' },
} as const;

export type CurrencyCode = keyof typeof SUPPORTED_CURRENCIES;

/**
 * Format currency amount with locale-specific formatting
 */
export const formatCurrency = (
  amount: number,
  currencyCode: CurrencyCode = 'KRW'
): string => {
  const currency = SUPPORTED_CURRENCIES[currencyCode];
  if (!currency) {
    return amount.toString();
  }

  try {
    return new Intl.NumberFormat(currency.locale, {
      style: 'currency',
      currency: currencyCode,
      minimumFractionDigits: currencyCode === 'KRW' || currencyCode === 'JPY' ? 0 : 2,
      maximumFractionDigits: currencyCode === 'KRW' || currencyCode === 'JPY' ? 0 : 2,
    }).format(amount);
  } catch (error) {
    // Fallback formatting
    return `${currency.symbol}${amount.toLocaleString(currency.locale)}`;
  }
};

/**
 * Parse currency input string to number
 */
export const parseCurrencyInput = (
  input: string,
  currencyCode: CurrencyCode = 'KRW'
): number => {
  // Remove currency symbols and formatting
  const currency = SUPPORTED_CURRENCIES[currencyCode];
  let cleaned = input.replace(currency.symbol, '');
  
  // Remove common formatting characters
  cleaned = cleaned.replace(/[,\s]/g, '');
  
  // Parse the number
  const parsed = parseFloat(cleaned);
  return isNaN(parsed) ? 0 : parsed;
};

/**
 * Get currency symbol for a given currency code
 */
export const getCurrencySymbol = (currencyCode: CurrencyCode): string => {
  return SUPPORTED_CURRENCIES[currencyCode]?.symbol || '';
};

/**
 * Format number with currency symbol but without locale formatting
 */
export const formatCurrencySimple = (
  amount: number,
  currencyCode: CurrencyCode = 'KRW'
): string => {
  const symbol = getCurrencySymbol(currencyCode);
  return `${symbol}${amount.toLocaleString()}`;
};

/**
 * Validate currency amount input
 */
export const validateCurrencyAmount = (
  input: string,
  min = 0,
  max = Infinity
): { isValid: boolean; error?: string } => {
  if (!input.trim()) {
    return { isValid: false, error: 'Amount is required' };
  }

  const amount = parseCurrencyInput(input);
  
  if (isNaN(amount)) {
    return { isValid: false, error: 'Invalid amount format' };
  }

  if (amount < min) {
    return { isValid: false, error: `Amount must be at least ${min}` };
  }

  if (amount > max) {
    return { isValid: false, error: `Amount must not exceed ${max}` };
  }

  return { isValid: true };
};