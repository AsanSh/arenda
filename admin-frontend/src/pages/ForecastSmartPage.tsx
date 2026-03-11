/**
 * Умный прогноз (Smart Forecast).
 * Показывается при REACT_APP_FEATURE_SMART_FORECAST=true.
 * Не заменяет текущий прогноз в Reports.
 */
import React, { useState, useEffect } from 'react';
import client from '../api/client';
import { formatAmount } from '../utils/currency';
import { TrendingUp, AlertTriangle } from 'lucide-react';

interface ForecastItem {
  contract_id: number;
  contract_number: string;
  tenant_name: string;
  property_name: string;
  base_expected: string;
  smart_expected: string;
  risk_score: number;
  confidence_score: number;
  payment_discipline: number;
  avg_delay_days: number;
  overdue_count: number;
}

interface Summary {
  base_expected_total: string;
  smart_expected_total: string;
  delta: string;
  high_risk_amount: string;
  from_date: string;
  to_date: string;
}

export default function ForecastSmartPage() {
  const [items, setItems] = useState<ForecastItem[]>([]);
  const [summary, setSummary] = useState<Summary | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const response = await client.get('/forecast/smart/calculate/?days=90');
        setItems(response.data.items || []);
        setSummary(response.data.summary || null);
      } catch (err) {
        console.error('Smart forecast fetch error:', err);
        setItems([]);
        setSummary(null);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, []);

  const getRiskBadge = (score: number) => {
    if (score > 50) return { label: 'Высокий риск', cls: 'bg-red-100 text-red-800' };
    if (score > 25) return { label: 'Средний риск', cls: 'bg-amber-100 text-amber-800' };
    return { label: 'Низкий риск', cls: 'bg-green-100 text-green-800' };
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-2">
        <TrendingUp className="h-6 w-6 text-indigo-600" />
        <h1 className="text-xl font-semibold text-slate-800">Умный прогноз</h1>
      </div>

      {loading ? (
        <div className="flex justify-center py-12">
          <div className="animate-spin h-10 w-10 border-2 border-indigo-600 border-t-transparent rounded-full" />
        </div>
      ) : (
        <>
          {summary && (
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="bg-white rounded-xl p-4 shadow-sm border border-slate-200">
                <p className="text-xs text-slate-500 mb-1">Базовый прогноз</p>
                <p className="text-lg font-semibold">{formatAmount(summary.base_expected_total)}</p>
              </div>
              <div className="bg-white rounded-xl p-4 shadow-sm border border-slate-200">
                <p className="text-xs text-slate-500 mb-1">Smart прогноз</p>
                <p className="text-lg font-semibold">{formatAmount(summary.smart_expected_total)}</p>
              </div>
              <div className="bg-white rounded-xl p-4 shadow-sm border border-slate-200">
                <p className="text-xs text-slate-500 mb-1">High risk amount</p>
                <p className="text-lg font-semibold text-amber-600">{formatAmount(summary.high_risk_amount)}</p>
              </div>
            </div>
          )}

          <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
            <table className="min-w-full divide-y divide-slate-200">
              <thead className="bg-slate-50">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-medium text-slate-600">Договор</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-slate-600">Арендатор</th>
                  <th className="px-4 py-3 text-right text-xs font-medium text-slate-600">Базовый</th>
                  <th className="px-4 py-3 text-right text-xs font-medium text-slate-600">Smart</th>
                  <th className="px-4 py-3 text-center text-xs font-medium text-slate-600">Риск</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200">
                {items.map((row) => {
                  const badge = getRiskBadge(row.risk_score);
                  return (
                    <tr key={row.contract_id}>
                      <td className="px-4 py-3 text-sm font-medium text-slate-800">{row.contract_number}</td>
                      <td className="px-4 py-3 text-sm text-slate-600">{row.tenant_name}</td>
                      <td className="px-4 py-3 text-sm text-right">{formatAmount(row.base_expected)}</td>
                      <td className="px-4 py-3 text-sm text-right">{formatAmount(row.smart_expected)}</td>
                      <td className="px-4 py-3 text-center">
                        <span className={`px-2 py-0.5 rounded text-xs font-medium ${badge.cls}`}>{badge.label}</span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {items.length === 0 && (
            <div className="bg-white rounded-xl p-12 text-center border border-slate-200">
              <AlertTriangle className="h-12 w-12 text-slate-300 mx-auto mb-4" />
              <p className="text-slate-500">Нет данных или feature выключен</p>
            </div>
          )}
        </>
      )}
    </div>
  );
}
