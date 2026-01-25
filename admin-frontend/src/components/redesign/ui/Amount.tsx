import React from 'react';

interface AmountProps {
  value: number | string;
  currency?: 'KGS' | 'USD' | 'RUB' | 'EUR';
  showCurrency?: boolean;
  className?: string;
}

export function Amount({
  value,
  currency = 'KGS',
  showCurrency = true,
  className = '',
}: AmountProps) {
  const numValue = typeof value === 'string' ? parseFloat(value.replace(/\s/g, '')) : value;
  const formatted = new Intl.NumberFormat('ru-RU', {
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(numValue);

  const currencyDisplay = currency === 'KGS' ? 'сом' : currency;

  return (
    <span className={className}>
      {formatted}
      {showCurrency && ` ${currencyDisplay}`}
    </span>
  );
}
