import React, { useState } from 'react';

interface DateFilterProps {
  value: string;
  dateFrom?: string;
  dateTo?: string;
  onChange: (period: string, from?: string, to?: string) => void;
}

export default function DateFilter({ value, dateFrom, dateTo, onChange }: DateFilterProps) {
  const [isOpen, setIsOpen] = useState(false);

  const handlePeriodChange = (period: string) => {
    if (period === 'custom') {
      onChange(period, dateFrom, dateTo);
    } else {
      onChange(period);
    }
    setIsOpen(false);
  };

  const getDateRange = (period: string) => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    switch (period) {
      case 'today':
        const todayStr = today.toISOString().split('T')[0];
        return { from: todayStr, to: todayStr };
      case 'yesterday':
        const yesterday = new Date(today);
        yesterday.setDate(yesterday.getDate() - 1);
        const yesterdayStr = yesterday.toISOString().split('T')[0];
        return { from: yesterdayStr, to: yesterdayStr };
      case 'today_7':
        const weekAgo = new Date(today);
        weekAgo.setDate(weekAgo.getDate() - 7);
        const weekLater = new Date(today);
        weekLater.setDate(weekLater.getDate() + 7);
        return { from: weekAgo.toISOString().split('T')[0], to: weekLater.toISOString().split('T')[0] };
      case 'today_30':
        const monthAgo = new Date(today);
        monthAgo.setDate(monthAgo.getDate() - 30);
        const monthLater = new Date(today);
        monthLater.setDate(monthLater.getDate() + 30);
        return { from: monthAgo.toISOString().split('T')[0], to: monthLater.toISOString().split('T')[0] };
      case 'current_week':
        const weekStart = new Date(today);
        weekStart.setDate(today.getDate() - today.getDay() + 1); // Понедельник
        const weekEnd = new Date(weekStart);
        weekEnd.setDate(weekStart.getDate() + 6);
        return { from: weekStart.toISOString().split('T')[0], to: weekEnd.toISOString().split('T')[0] };
      case 'month':
        const monthStart = new Date(today.getFullYear(), today.getMonth(), 1);
        const monthEnd = new Date(today.getFullYear(), today.getMonth() + 1, 0);
        return { from: monthStart.toISOString().split('T')[0], to: monthEnd.toISOString().split('T')[0] };
      case 'quarter':
        const quarter = Math.floor(today.getMonth() / 3);
        const quarterStart = new Date(today.getFullYear(), quarter * 3, 1);
        const quarterEnd = new Date(today.getFullYear(), (quarter + 1) * 3, 0);
        return { from: quarterStart.toISOString().split('T')[0], to: quarterEnd.toISOString().split('T')[0] };
      case 'year':
        const yearStart = new Date(today.getFullYear(), 0, 1);
        const yearEnd = new Date(today.getFullYear(), 11, 31);
        return { from: yearStart.toISOString().split('T')[0], to: yearEnd.toISOString().split('T')[0] };
      case 'last_week':
        const lastWeekStart = new Date(today);
        lastWeekStart.setDate(today.getDate() - today.getDay() - 6);
        const lastWeekEnd = new Date(lastWeekStart);
        lastWeekEnd.setDate(lastWeekStart.getDate() + 6);
        return { from: lastWeekStart.toISOString().split('T')[0], to: lastWeekEnd.toISOString().split('T')[0] };
      case 'last_month':
        const lastMonthStart = new Date(today.getFullYear(), today.getMonth() - 1, 1);
        const lastMonthEnd = new Date(today.getFullYear(), today.getMonth(), 0);
        return { from: lastMonthStart.toISOString().split('T')[0], to: lastMonthEnd.toISOString().split('T')[0] };
      case 'last_quarter':
        const lastQuarter = Math.floor((today.getMonth() - 1) / 3);
        const lastQuarterStart = new Date(today.getFullYear(), lastQuarter * 3, 1);
        const lastQuarterEnd = new Date(today.getFullYear(), (lastQuarter + 1) * 3, 0);
        return { from: lastQuarterStart.toISOString().split('T')[0], to: lastQuarterEnd.toISOString().split('T')[0] };
      case 'last_year':
        const lastYearStart = new Date(today.getFullYear() - 1, 0, 1);
        const lastYearEnd = new Date(today.getFullYear() - 1, 11, 31);
        return { from: lastYearStart.toISOString().split('T')[0], to: lastYearEnd.toISOString().split('T')[0] };
      default:
        return { from: '', to: '' };
    }
  };

  const formatDateRange = () => {
    if (!value) return '';
    if (value === 'custom' && dateFrom && dateTo) {
      const from = new Date(dateFrom);
      const to = new Date(dateTo);
      return `${from.toLocaleDateString('ru-RU', { day: '2-digit', month: '2-digit', year: 'numeric' })} - ${to.toLocaleDateString('ru-RU', { day: '2-digit', month: '2-digit', year: 'numeric' })}`;
    }
    const range = getDateRange(value);
    if (range.from && range.to) {
      const from = new Date(range.from);
      const to = new Date(range.to);
      return `${from.toLocaleDateString('ru-RU', { day: '2-digit', month: '2-digit', year: 'numeric' })} - ${to.toLocaleDateString('ru-RU', { day: '2-digit', month: '2-digit', year: 'numeric' })}`;
    }
    return '';
  };

  const periods = [
    { value: 'today', label: 'Сегодня' },
    { value: 'yesterday', label: 'Вчера' },
    { value: 'today_7', label: 'Сегодня ± 7 дней' },
    { value: 'today_30', label: 'Сегодня ± 30 дней' },
    { value: 'current_week', label: 'Текущая неделя' },
    { value: 'month', label: 'Текущий месяц' },
    { value: 'quarter', label: 'Текущий квартал' },
    { value: 'year', label: 'Текущий год' },
    { value: 'last_week', label: 'Прошлая неделя' },
    { value: 'last_month', label: 'Прошлый месяц' },
    { value: 'last_quarter', label: 'Прошлый квартал' },
    { value: 'last_year', label: 'Прошлый год' },
    { value: 'all', label: 'Все время' },
    { value: 'custom', label: 'Период' },
  ];

  return (
    <div className="relative">
      <div className="flex items-center space-x-2">
        <input
          type="text"
          readOnly
          value={formatDateRange()}
          onClick={() => setIsOpen(!isOpen)}
          placeholder="Выберите период"
          className="w-full px-2 py-1 text-xs border border-gray-300 rounded focus:ring-primary-500 focus:border-primary-500 cursor-pointer"
        />
      </div>
      
      {isOpen && (
        <>
          <div 
            className="fixed inset-0 z-10" 
            onClick={() => setIsOpen(false)}
          />
          <div className="absolute z-20 mt-1 w-56 bg-white border border-gray-300 rounded-lg shadow-lg max-h-96 overflow-y-auto">
            {periods.map((period) => (
              <button
                key={period.value}
                type="button"
                onClick={() => {
                  if (period.value === 'custom') {
                    handlePeriodChange('custom');
                  } else if (period.value === 'all') {
                    handlePeriodChange('');
                  } else {
                    const range = getDateRange(period.value);
                    onChange(period.value, range.from, range.to);
                    setIsOpen(false);
                  }
                }}
                className={`w-full text-left px-3 py-2 text-xs hover:bg-gray-100 ${
                  value === period.value ? 'bg-primary-50 border-l-2 border-primary-600' : ''
                }`}
              >
                {period.label}
              </button>
            ))}
          </div>
        </>
      )}

      {value === 'custom' && (
        <div className="mt-2 flex space-x-2">
          <input
            type="date"
            value={dateFrom || ''}
            onChange={(e) => onChange('custom', e.target.value, dateTo)}
            className="flex-1 px-2 py-1 text-xs border border-gray-300 rounded focus:ring-primary-500 focus:border-primary-500"
          />
          <input
            type="date"
            value={dateTo || ''}
            onChange={(e) => onChange('custom', dateFrom, e.target.value)}
            className="flex-1 px-2 py-1 text-xs border border-gray-300 rounded focus:ring-primary-500 focus:border-primary-500"
          />
        </div>
      )}
    </div>
  );
}
