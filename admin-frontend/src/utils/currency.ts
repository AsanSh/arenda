/**
 * Утилиты для работы с валютами
 */

export const CURRENCY_SYMBOLS: Record<string, string> = {
  KGS: 'с',
  USD: '$',
  RUB: '₽',
  EUR: '€',
};

export const CURRENCY_NAMES: Record<string, string> = {
  KGS: 'с',
  USD: 'USD',
  RUB: 'RUB',
  EUR: 'EUR',
};

/**
 * Форматирует сумму с валютой (без десятичных знаков)
 */
export function formatCurrency(amount: number | string, currency: string = 'KGS'): string {
  // Используем более точное преобразование для избежания проблем с округлением
  let numAmount: number;
  if (typeof amount === 'string') {
    // Убираем пробелы и заменяем запятую на точку
    const cleanAmount = amount.replace(/\s/g, '').replace(',', '.');
    numAmount = parseFloat(cleanAmount);
    // Если parseFloat дал NaN, пробуем более точный метод
    if (isNaN(numAmount)) {
      numAmount = 0;
    }
  } else {
    numAmount = amount;
  }
  
  const symbol = CURRENCY_SYMBOLS[currency] || currency;
  // Форматируем без десятичных знаков (0 знаков после запятой)
  const formatted = Math.round(numAmount).toLocaleString('ru-RU', {
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
    useGrouping: true,
  });
  
  // Для сомов ставим символ после суммы, для остальных - перед
  if (currency === 'KGS') {
    return `${formatted} ${symbol}`;
  }
  return `${symbol} ${formatted}`;
}

/**
 * Форматирует сумму без символа валюты (только число, без десятичных знаков)
 */
export function formatAmount(amount: number | string): string {
  const numAmount = typeof amount === 'string' ? parseFloat(amount) : amount;
  return Math.round(numAmount).toLocaleString('ru-RU', {
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
    useGrouping: true,
  });
}
