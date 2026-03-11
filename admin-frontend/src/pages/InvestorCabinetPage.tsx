/**
 * Кабинет инвестора.
 * Показывается при REACT_APP_FEATURE_INVESTOR_PORTAL=true.
 */
import React, { useState, useEffect } from 'react';
import client from '../api/client';
import { Wallet, Home, FileText } from 'lucide-react';

export default function InvestorCabinetPage() {
  const [data, setData] = useState<{ properties: unknown[]; positions: unknown[]; payouts: unknown[] } | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const response = await client.get('/investor/dashboard/');
        setData(response.data);
      } catch (err) {
        console.error('Investor cabinet fetch error:', err);
        setData({ properties: [], positions: [], payouts: [] });
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, []);

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-2">
        <Wallet className="h-6 w-6 text-indigo-600" />
        <h1 className="text-xl font-semibold text-slate-800">Инвесторский кабинет</h1>
      </div>

      {loading ? (
        <div className="flex justify-center py-12">
          <div className="animate-spin h-10 w-10 border-2 border-indigo-600 border-t-transparent rounded-full" />
        </div>
      ) : (
        <div className="grid gap-4 md:grid-cols-2">
          <div className="bg-white rounded-xl p-6 shadow-sm border border-slate-200">
            <h2 className="font-medium text-slate-800 flex items-center gap-2 mb-4">
              <Home className="h-5 w-5" />
              Доступные объекты
            </h2>
            {data?.properties?.length ? (
              <ul className="space-y-2">
                {(data.properties as { id: number; name: string }[]).map((p) => (
                  <li key={p.id} className="text-sm text-slate-600">{p.name}</li>
                ))}
              </ul>
            ) : (
              <p className="text-sm text-slate-500">Нет объектов</p>
            )}
          </div>
          <div className="bg-white rounded-xl p-6 shadow-sm border border-slate-200">
            <h2 className="font-medium text-slate-800 flex items-center gap-2 mb-4">
              <FileText className="h-5 w-5" />
              Документы и отчёты
            </h2>
            <p className="text-sm text-slate-500">Раздел в разработке</p>
          </div>
        </div>
      )}
    </div>
  );
}
