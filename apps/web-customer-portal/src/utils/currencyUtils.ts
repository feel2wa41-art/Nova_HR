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

/**
 * Indonesian-specific currency formatting
 */

/**
 * Convert number to Indonesian local notation (juta, ribu)
 */
export const formatToLocalIDR = (amount: number): string => {
  if (amount >= 1000000) {
    const juta = Math.floor(amount / 1000000);
    const remainder = amount % 1000000;
    
    if (remainder === 0) {
      return `${amount.toLocaleString('id-ID')} RP (${juta} juta)`;
    } else if (remainder >= 1000) {
      const ribu = Math.floor(remainder / 1000);
      const remainderRibu = remainder % 1000;
      
      if (remainderRibu === 0) {
        return `${amount.toLocaleString('id-ID')} RP (${juta} juta ${ribu} ribu)`;
      } else {
        return `${amount.toLocaleString('id-ID')} RP (${juta} juta ${ribu} ribu ${remainderRibu})`;
      }
    } else {
      return `${amount.toLocaleString('id-ID')} RP (${juta} juta ${remainder})`;
    }
  } else if (amount >= 1000) {
    const ribu = Math.floor(amount / 1000);
    const remainder = amount % 1000;
    
    if (remainder === 0) {
      return `${amount.toLocaleString('id-ID')} RP (${ribu} ribu)`;
    } else {
      return `${amount.toLocaleString('id-ID')} RP (${ribu} ribu ${remainder})`;
    }
  } else {
    return `${amount.toLocaleString('id-ID')} RP`;
  }
};

/**
 * Parse Indonesian local notation back to number
 */
export const parseLocalIDR = (input: string): number => {
  // Remove RP and parentheses content
  const cleaned = input.replace(/RP.*$/, '').replace(/[,.]/g, '');
  return parseInt(cleaned) || 0;
};

/**
 * Format currency by currency code with local preferences
 */
export const formatByCurrencyCode = (
  amount: number,
  currencyCode: CurrencyCode,
  useLocalNotation = false
): string => {
  if (currencyCode === 'IDR' && useLocalNotation) {
    return formatToLocalIDR(amount);
  }
  
  return formatCurrency(amount, currencyCode);
};

/**
 * Business trip expense formatter with currency and local notation
 */
export const businessTripFormatter = {
  /**
   * Format accommodation expense
   */
  accommodation: (amount: number, currencyCode: CurrencyCode = 'IDR'): string => {
    return formatByCurrencyCode(amount, currencyCode, currencyCode === 'IDR');
  },

  /**
   * Format meal expense
   */
  meal: (amount: number, currencyCode: CurrencyCode = 'IDR'): string => {
    return formatByCurrencyCode(amount, currencyCode, currencyCode === 'IDR');
  },

  /**
   * Format transportation expense
   */
  transportation: (amount: number, currencyCode: CurrencyCode = 'IDR'): string => {
    return formatByCurrencyCode(amount, currencyCode, currencyCode === 'IDR');
  },

  /**
   * Format miscellaneous expense
   */
  miscellaneous: (amount: number, currencyCode: CurrencyCode = 'IDR'): string => {
    return formatByCurrencyCode(amount, currencyCode, currencyCode === 'IDR');
  },

  /**
   * Format total expense with breakdown
   */
  total: (
    expenses: {
      accommodation: number;
      meal: number;
      transportation: number;
      miscellaneous: number;
    },
    currencyCode: CurrencyCode = 'IDR'
  ): { total: string; breakdown: string } => {
    const total = expenses.accommodation + expenses.meal + expenses.transportation + expenses.miscellaneous;
    
    return {
      total: formatByCurrencyCode(total, currencyCode, currencyCode === 'IDR'),
      breakdown: [
        `숙박비: ${formatByCurrencyCode(expenses.accommodation, currencyCode, currencyCode === 'IDR')}`,
        `식비: ${formatByCurrencyCode(expenses.meal, currencyCode, currencyCode === 'IDR')}`,
        `교통비: ${formatByCurrencyCode(expenses.transportation, currencyCode, currencyCode === 'IDR')}`,
        `기타비용: ${formatByCurrencyCode(expenses.miscellaneous, currencyCode, currencyCode === 'IDR')}`
      ].join(' | ')
    };
  }
};

/**
 * Currency conversion utility (for future use with exchange rates)
 */
export const currencyConverter = {
  /**
   * Placeholder for currency conversion (requires exchange rate API)
   */
  convert: (
    amount: number,
    fromCurrency: CurrencyCode,
    toCurrency: CurrencyCode,
    exchangeRate: number
  ): number => {
    if (fromCurrency === toCurrency) return amount;
    return amount * exchangeRate;
  },

  /**
   * Format converted amount with both currencies
   */
  formatConverted: (
    amount: number,
    fromCurrency: CurrencyCode,
    toCurrency: CurrencyCode,
    exchangeRate: number
  ): string => {
    const converted = currencyConverter.convert(amount, fromCurrency, toCurrency, exchangeRate);
    return `${formatCurrency(amount, fromCurrency)} (${formatCurrency(converted, toCurrency)})`;
  }
};