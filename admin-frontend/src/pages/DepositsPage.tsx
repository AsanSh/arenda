import React, { useState, useEffect } from 'react';
import { Search } from 'lucide-react';
import client from '../api/client';
import { formatAmount } from '../utils/currency';
import PeriodFilterBar from '../components/PeriodFilterBar';
import CounterpartyFilter from '../components/CounterpartyFilter';
import ActionsMenu from '../components/ui/ActionsMenu';
import { DatePreset } from '../utils/datePresets';

interface Deposit {
  id: number;
  contract_number: string;
  tenant_name: string;
  tenant_id: number;
  property_name: string;
  property_id: number;
  account_name: string;
  account_id?: number;
  amount: string;
  balance: string;
  currency?: string;
  created_at?: string;
}

export default function DepositsPage() {
  const [deposits, setDeposits] = useState<Deposit[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedTenants, setSelectedTenants] = useState<number[]>([]);
  const [tenants, setTenants] = useState<{ id: number; name: string }[]>([]);
  const [search, setSearch] = useState('');
  const [dateFilter, setDateFilter] = useState<{ preset: DatePreset | null; from: string | null; to: string | null }>({
    preset: null,
    from: null,
    to: null,
  });

  useEffect(() => {
    fetchDeposits();
    fetchTenants();
  }, [selectedTenants, dateFilter]);

  const fetchTenants = async () => {
    try {
      const response = await client.get('/tenants/');
      setTenants(response.data.results || response.data || []);
    } catch (error) {
      console.error('Error fetching tenants:', error);
    }
  };

  const fetchDeposits = async () => {
    try {
      let url = '/deposits/';
      const params = new URLSearchParams();
      
      if (selectedTenants.length > 0) {
        selectedTenants.forEach(id => params.append('contract__tenant', id.toString()));
      }
      
      if (dateFilter.from) params.append('created_at__gte', dateFilter.from);
      if (dateFilter.to) params.append('created_at__lte', dateFilter.to);
      
      if (params.toString()) {
        url += `?${params.toString()}`;
      }
      
      const response = await client.get(url);
      setDeposits(response.data.results || response.data);
      setLoading(false);
    } catch (error) {
      console.error('Error fetching deposits:', error);
      setLoading(false);
    }
  };

  const handleDelete = async (deposit: Deposit) => {
    if (!window.confirm(`Вы уверены, что хотите удалить депозит по договору "${deposit.contract_number}"?`)) {
      return;
    }

    try {
      await client.delete(`/deposits/${deposit.id}/`);
      fetchDeposits();
    } catch (error: any) {
      let errorMessage = 'Ошибка при удалении';
      if (error.response?.data) {
        if (error.response.data.detail) {
          errorMessage = error.response.data.detail;
        } else if (Array.isArray(error.response.data.non_field_errors)) {
          errorMessage = error.response.data.non_field_errors[0];
        } else if (error.response.data.error) {
          errorMessage = error.response.data.error;
        } else if (typeof error.response.data === 'string') {
          errorMessage = error.response.data;
        }
      }
      alert(errorMessage);
    }
  };

  if (loading) {
    return <div className="text-center py-12">Загрузка...</div>;
  }

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Депозиты</h1>
      </div>

      {/* Поиск - сверху отдельно */}
      <div className="bg-white p-2 rounded-lg shadow-sm border border-gray-200 mb-3">
        <div className="relative">
          <Search className="absolute left-2 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
          <input
            type="text"
            placeholder="№ договора, контрагент, объект..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-8 pr-3 py-1.5 text-sm border border-gray-300 rounded focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
          />
        </div>
      </div>

      {/* Фильтры в виде вкладок */}
      <div className="bg-white p-2 rounded-lg shadow-sm border border-gray-200 mb-3">
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-xs font-medium text-gray-700 mr-1">Показать:</span>
          <div className="ml-auto flex items-center gap-2">
            <div className="min-w-[180px]">
              <CounterpartyFilter
                counterparts={tenants}
                selected={selectedTenants}
                onChange={setSelectedTenants}
              />
            </div>
            <PeriodFilterBar
              value={dateFilter}
              onChange={setDateFilter}
              urlParamPrefix="created_at"
            />
          </div>
        </div>
      </div>

      {/* KPI Депозиты */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mb-4">
        <div className="bg-white p-3 rounded-card shadow-medium border border-slate-200">
          <div className="text-xs font-medium text-slate-500 uppercase tracking-wide mb-1">Всего депозитов</div>
          <div className="text-xl font-semibold text-slate-900">{deposits.length}</div>
        </div>
        <div className="bg-white p-3 rounded-card shadow-medium border border-slate-200">
          <div className="text-xs font-medium text-slate-500 uppercase tracking-wide mb-1">Общая сумма</div>
          <div className="text-xl font-semibold text-slate-900">
            {formatAmount(deposits.reduce((sum, d) => sum + parseFloat(d.amount), 0).toString())} с
          </div>
        </div>
        <div className="bg-white p-3 rounded-card shadow-medium border border-slate-200">
          <div className="text-xs font-medium text-slate-500 uppercase tracking-wide mb-1">Остаток</div>
          <div className="text-xl font-semibold text-purple-600">
            {formatAmount(deposits.reduce((sum, d) => sum + parseFloat(d.balance), 0).toString())} с
          </div>
        </div>
      </div>

      <div className="bg-white shadow rounded-lg overflow-hidden">
        <div className="overflow-x-auto -mx-4 md:mx-0">
          <div className="inline-block min-w-full align-middle">
            <table className="min-w-full divide-y divide-gray-100">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-2 py-1 text-left text-xs font-medium text-gray-500 tracking-wider leading-none">
                    Договор
                  </th>
                  <th className="px-2 py-1 text-left text-xs font-medium text-gray-500 tracking-wider leading-none">
                    Контрагент
                  </th>
                  <th className="px-2 py-1 text-left text-xs font-medium text-gray-500 tracking-wider leading-none">
                    Объект
                  </th>
                  <th className="px-2 py-1 text-left text-xs font-medium text-gray-500 tracking-wider leading-none">
                    Счет
                  </th>
                  <th className="px-2 py-1 text-left text-xs font-medium text-gray-500 tracking-wider leading-none">
                    Сумма депозита
                  </th>
                  <th className="px-2 py-1 text-left text-xs font-medium text-gray-500 tracking-wider leading-none">
                    Остаток
                  </th>
                  <th className="px-2 py-1 text-left text-xs font-medium text-gray-500 tracking-wider leading-none">
                    Действия
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-100">
                {deposits.filter(d => !search || d.contract_number.toLowerCase().includes(search.toLowerCase()) || d.tenant_name.toLowerCase().includes(search.toLowerCase()) || d.property_name.toLowerCase().includes(search.toLowerCase())).map((deposit, index) => (
                  <tr key={deposit.id} className={`${index % 2 === 0 ? 'bg-white' : 'bg-primary-50'} leading-none`}>
                    <td className="px-2 py-0.5 whitespace-nowrap text-xs font-medium text-gray-900 leading-tight">
                      {deposit.contract_number}
                    </td>
                    <td className="px-2 py-0.5 whitespace-nowrap text-xs text-gray-500 leading-tight">
                      {deposit.tenant_name}
                    </td>
                    <td className="px-2 py-0.5 whitespace-nowrap text-xs text-gray-500 leading-tight">
                      {deposit.property_name}
                    </td>
                    <td className="px-2 py-0.5 whitespace-nowrap text-xs text-gray-500 leading-tight">
                      {deposit.account_name || 'Не указан'}
                    </td>
                    <td className="px-2 py-0.5 whitespace-nowrap text-xs text-gray-500 leading-tight">
                      {formatAmount(deposit.amount)} {deposit.currency || 'сом'}
                    </td>
                    <td className="px-2 py-0.5 whitespace-nowrap text-xs font-medium text-gray-900 leading-tight">
                      {formatAmount(deposit.balance)} {deposit.currency || 'сом'}
                    </td>
                    <td className="px-2 py-0.5 whitespace-nowrap text-right leading-tight">
                      <div className="flex justify-end group">
                        <ActionsMenu
                          items={[
                            { label: 'Редактировать', onClick: () => {/* TODO: добавить редактирование */} },
                            { label: 'Удалить', onClick: () => handleDelete(deposit), variant: 'danger' },
                          ]}
                        />
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}
