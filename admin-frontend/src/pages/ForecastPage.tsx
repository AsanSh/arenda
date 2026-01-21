import React, { useState, useEffect, useMemo, useCallback } from 'react';
import client from '../api/client';
import { formatCurrency } from '../utils/currency';
import PeriodFilterBar from '../components/PeriodFilterBar';
import { DatePreset, getPresetRange } from '../utils/datePresets';

interface Forecast {
  period: {
    from: string;
    to: string;
    days: number;
  };
  summary: {
    accrued: string;  // Начислено
    received: string;  // Поступления
    balance: string;   // Остаток
    overdue: string;   // Просрочено
  };
  monthly: Record<string, {
    accrued: string;   // Начислено
    received: string;  // Поступления
    balance: string;   // Остаток
    overdue: string;   // Просрочено
  }>;
}

export default function ForecastPage() {
  const [forecast, setForecast] = useState<Forecast | null>(null);
  const [loading, setLoading] = useState(true);
  const [dateFilter, setDateFilter] = useState<{ preset: DatePreset | null; from: string | null; to: string | null }>({
    preset: 'today_plus_30',
    from: null,
    to: null,
  });

  // Стабилизируем setDateFilter с useCallback
  const handleDateFilterChange = useCallback((newFilter: { preset: DatePreset | null; from: string | null; to: string | null }) => {
    setDateFilter(prev => {
      // Проверяем, действительно ли изменились значения
      if (
        prev.preset === newFilter.preset &&
        prev.from === newFilter.from &&
        prev.to === newFilter.to
      ) {
        return prev; // Возвращаем тот же объект, если ничего не изменилось
      }
      return newFilter;
    });
  }, []);

  // Стабилизируем объект dateFilter для предотвращения бесконечных циклов
  const dateFilterKey = useMemo(() => {
    return `${dateFilter.preset || 'null'}_${dateFilter.from || 'null'}_${dateFilter.to || 'null'}`;
  }, [dateFilter.preset, dateFilter.from, dateFilter.to]);

  const fetchForecast = useCallback(async () => {
    try {
      setLoading(true);
      let url = '/forecast/calculate/';
      const params = new URLSearchParams();
      
      // Определяем период на основе фильтра
      let fromDateStr: string | null = null;
      let toDateStr: string | null = null;
      let isAllTime = false;
      
      if (dateFilter.preset === 'all_time') {
        // Для "Все время" не передаем даты
        isAllTime = true;
      } else if (dateFilter.preset) {
        const range = getPresetRange(dateFilter.preset);
        fromDateStr = range.from;
        toDateStr = range.to;
      } else if (dateFilter.from && dateFilter.to) {
        fromDateStr = dateFilter.from;
        toDateStr = dateFilter.to;
      }
      
      // Если нет дат и не "Все время", используем по умолчанию: сегодня + 30 дней
      if (!isAllTime && (!fromDateStr || !toDateStr)) {
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        const toDate = new Date(today);
        toDate.setDate(toDate.getDate() + 30);
        fromDateStr = today.toISOString().split('T')[0];
        toDateStr = toDate.toISOString().split('T')[0];
      }
      
      // Передаем параметры в API
      if (isAllTime) {
        params.append('all_time', 'true');
      } else if (fromDateStr && toDateStr) {
        params.append('from', fromDateStr);
        params.append('to', toDateStr);
      }
      
      if (params.toString()) {
        url += `?${params.toString()}`;
      }
      
      const response = await client.get(url);
      setForecast(response.data);
      setLoading(false);
    } catch (error) {
      console.error('Error fetching forecast:', error);
      setLoading(false);
    }
  }, [dateFilter]);

  useEffect(() => {
    fetchForecast();
  }, [dateFilterKey, fetchForecast]);


  if (loading) {
    return <div className="text-center py-12">Загрузка...</div>;
  }

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Прогноз</h1>
      </div>

      {/* Фильтры */}
      <div className="bg-white p-3 rounded-lg shadow mb-4">
        <div className="flex items-end gap-3">
          <div className="flex-shrink-0">
            <label className="block text-xs font-medium text-gray-700 mb-1">Период</label>
            <PeriodFilterBar
              value={dateFilter}
              onChange={handleDateFilterChange}
              urlParamPrefix="forecast_date"
              allowFuture={true}
            />
          </div>
        </div>
      </div>

      {forecast && (
        <>
          <div className="grid grid-cols-4 gap-6 mb-8">
            <div className="bg-white p-6 rounded-lg shadow">
              <h3 className="text-sm font-medium text-gray-500 mb-2">Начислено</h3>
              <p className="text-3xl font-bold text-gray-900">
                {formatCurrency(forecast.summary.accrued || '0', 'KGS')}
              </p>
            </div>
            <div className="bg-white p-6 rounded-lg shadow">
              <h3 className="text-sm font-medium text-gray-500 mb-2">Поступления</h3>
              <p className="text-3xl font-bold text-purple-600">
                {formatCurrency(forecast.summary.received || '0', 'KGS')}
              </p>
            </div>
            <div className="bg-white p-6 rounded-lg shadow">
              <h3 className="text-sm font-medium text-gray-500 mb-2">Остаток</h3>
              <p className="text-3xl font-bold text-blue-600">
                {formatCurrency(forecast.summary.balance || '0', 'KGS')}
              </p>
            </div>
            <div className="bg-white p-6 rounded-lg shadow">
              <h3 className="text-sm font-medium text-gray-500 mb-2">Просрочено</h3>
              <p className="text-3xl font-bold text-red-600">
                {formatCurrency(forecast.summary.overdue || '0', 'KGS')}
              </p>
            </div>
          </div>

          <div className="bg-white shadow rounded-lg overflow-hidden">
            <h2 className="px-6 py-4 text-lg font-semibold border-b">По месяцам</h2>
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 tracking-wider">
                    Месяц
                  </th>
                  <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 tracking-wider">
                    Начислено
                  </th>
                  <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 tracking-wider">
                    Поступления
                  </th>
                  <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 tracking-wider">
                    Остаток
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {Object.entries(forecast.monthly)
                  .sort(([a], [b]) => a.localeCompare(b))
                  .map(([month, data], index) => {
                    // Форматируем месяц для отображения (YYYY-MM -> YYYY-MM)
                    const [year, monthNum] = month.split('-');
                    const monthNames = ['Январь', 'Февраль', 'Март', 'Апрель', 'Май', 'Июнь', 
                                      'Июль', 'Август', 'Сентябрь', 'Октябрь', 'Ноябрь', 'Декабрь'];
                    const monthName = monthNames[parseInt(monthNum) - 1];
                    const displayMonth = `${monthName} ${year}`;
                    
                    return (
                      <tr key={month} className={index % 2 === 0 ? 'bg-white' : 'bg-primary-50'}>
                        <td className="px-4 py-2 whitespace-nowrap text-sm font-medium text-gray-900">
                          {displayMonth}
                        </td>
                        <td className="px-4 py-2 whitespace-nowrap text-sm text-gray-500">
                          {formatCurrency(data.accrued || '0', 'KGS')}
                        </td>
                        <td className="px-4 py-2 whitespace-nowrap text-sm text-purple-600 font-medium">
                          {formatCurrency(data.received || '0', 'KGS')}
                        </td>
                        <td className="px-4 py-2 whitespace-nowrap text-sm font-medium text-gray-900">
                          {formatCurrency(data.balance || '0', 'KGS')}
                        </td>
                      </tr>
                    );
                  })}
              </tbody>
            </table>
          </div>
        </>
      )}
    </div>
  );
}
