/**
 * Аналитика по объектам недвижимости.
 * Показывается при REACT_APP_FEATURE_ANALYTICS=true.
 * Не заменяет Dashboard и Reports.
 */
import React, { useState, useEffect, useCallback } from 'react';
import { fetchPropertyAnalyticsSummary } from '../api/analytics';
import type { PropertyAnalyticsItem, PropertyAnalyticsSummary } from '../api/analytics';
import { formatAmount } from '../utils/currency';
import PeriodFilterBar from '../components/PeriodFilterBar';
import { getPresetRange } from '../utils/datePresets';
import type { DatePreset } from '../utils/datePresets';
import { BarChart3, Home } from 'lucide-react';

export default function AnalyticsPropertiesPage() {
  const [summary, setSummary] = useState<PropertyAnalyticsSummary | null>(null);
  const [properties, setProperties] = useState<PropertyAnalyticsItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [dateFilter, setDateFilter] = useState<{ preset: DatePreset | null; from: string | null; to: string | null }>({
    preset: 'current_year',
    from: null,
    to: null,
  });

  const effectiveRange = dateFilter.preset
    ? getPresetRange(dateFilter.preset)
    : { from: dateFilter.from, to: dateFilter.to };

  const fetchData = useCallback(async () => {
    try {
      setLoading(true);
      const data = await fetchPropertyAnalyticsSummary({
        from: effectiveRange.from ?? undefined,
        to: effectiveRange.to ?? undefined,
      });
      setSummary(data);
      setProperties(data.properties || []);
    } catch (err) {
      console.error('Analytics fetch error:', err);
      setSummary(null);
      setProperties([]);
    } finally {
      setLoading(false);
    }
  }, [effectiveRange.from, effectiveRange.to]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-semibold text-slate-800 flex items-center gap-2">
          <BarChart3 className="h-6 w-6" />
          Аналитика по объектам
        </h1>
      </div>

      <PeriodFilterBar value={dateFilter} onChange={setDateFilter} />

      {loading ? (
        <div className="flex justify-center py-12">
          <div className="animate-spin h-10 w-10 border-2 border-indigo-600 border-t-transparent rounded-full" />
        </div>
      ) : summary ? (
        <div className="space-y-6">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="bg-white rounded-xl p-4 shadow-sm border border-slate-200">
              <p className="text-xs text-slate-500 mb-1">Начислено</p>
              <p className="text-lg font-semibold text-slate-800">{formatAmount(summary.total_accrued)}</p>
            </div>
            <div className="bg-white rounded-xl p-4 shadow-sm border border-slate-200">
              <p className="text-xs text-slate-500 mb-1">Оплачено</p>
              <p className="text-lg font-semibold text-green-600">{formatAmount(summary.total_paid)}</p>
            </div>
            <div className="bg-white rounded-xl p-4 shadow-sm border border-slate-200">
              <p className="text-xs text-slate-500 mb-1">Задолженность</p>
              <p className="text-lg font-semibold text-amber-600">{formatAmount(summary.outstanding_debt)}</p>
            </div>
            <div className="bg-white rounded-xl p-4 shadow-sm border border-slate-200">
              <p className="text-xs text-slate-500 mb-1">Collection Rate</p>
              <p className="text-lg font-semibold text-slate-800">{summary.collection_rate}%</p>
            </div>
          </div>

          {properties.length > 0 && (
            <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
              <table className="min-w-full divide-y divide-slate-200">
                <thead className="bg-slate-50">
                  <tr>
                    <th className="px-4 py-3 text-left text-xs font-medium text-slate-600">Объект</th>
                    <th className="px-4 py-3 text-right text-xs font-medium text-slate-600">Начислено</th>
                    <th className="px-4 py-3 text-right text-xs font-medium text-slate-600">Оплачено</th>
                    <th className="px-4 py-3 text-right text-xs font-medium text-slate-600">Задолженность</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200">
                  {properties.map((p) => (
                    <tr key={p.id}>
                      <td className="px-4 py-3 text-sm font-medium text-slate-800">{p.name}</td>
                      <td className="px-4 py-3 text-sm text-right">{formatAmount(p.total_accrued)}</td>
                      <td className="px-4 py-3 text-sm text-right text-green-600">{formatAmount(p.total_paid)}</td>
                      <td className="px-4 py-3 text-sm text-right text-amber-600">{formatAmount(p.outstanding_debt)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {properties.length === 0 && (
            <div className="bg-white rounded-xl p-12 text-center border border-slate-200">
              <Home className="h-12 w-12 text-slate-300 mx-auto mb-4" />
              <p className="text-slate-500">Нет данных по объектам за выбранный период</p>
            </div>
          )}
        </div>
      ) : (
        <div className="bg-white rounded-xl p-12 text-center border border-slate-200">
          <p className="text-slate-500">Не удалось загрузить аналитику. Проверьте, что FEATURE_ANALYTICS включён.</p>
        </div>
      )}
    </div>
  );
}
