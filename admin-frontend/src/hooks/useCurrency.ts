import { useMemo } from 'react';

const CURRENCY_SYMBOLS: Record<string, string> = {
  KGS: 'с',
  USD: '$',
  RUB: '₽',
  EUR: '€',
};

/**
 * Хук для форматирования валюты в Fintech стиле (без десятичных знаков)
 */
export function useCurrency() {
  const formatCurrency = useMemo(() => {
    return (amount: number | string, currency: string = 'KGS'): string => {
      let numAmount: number;
      if (typeof amount === 'string') {
        const cleanAmount = amount.replace(/\s/g, '').replace(',', '.');
        numAmount = parseFloat(cleanAmount);
        if (isNaN(numAmount)) {
          numAmount = 0;
        }
      } else {
        numAmount = amount;
      }
      
      // Используем Math.floor для удаления десятичных знаков
      const rounded = Math.floor(numAmount);
      const symbol = CURRENCY_SYMBOLS[currency] || currency;
      
      const formatted = rounded.toLocaleString('ru-RU', {
        minimumFractionDigits: 0,
        maximumFractionDigits: 0,
        useGrouping: true,
      });
      
      if (currency === 'KGS') {
        return `${formatted} ${symbol}`;
      }
      return `${symbol} ${formatted}`;
    };
  }, []);

  const formatAmount = useMemo(() => {
    return (amount: number | string): string => {
      const numAmount = typeof amount === 'string' ? parseFloat(amount) : amount;
      const rounded = Math.floor(numAmount);
      return rounded.toLocaleString('ru-RU', {
        minimumFractionDigits: 0,
        maximumFractionDigits: 0,
        useGrouping: true,
      });
    };
  }, []);

  return { formatCurrency, formatAmount };
}
