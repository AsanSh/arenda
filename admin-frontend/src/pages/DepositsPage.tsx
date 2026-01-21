import React, { useState, useEffect } from 'react';
import client from '../api/client';
import { formatAmount } from '../utils/currency';
import PeriodFilterBar from '../components/PeriodFilterBar';
import CounterpartyFilter from '../components/CounterpartyFilter';
import { DatePreset } from '../utils/datePresets';

interface Deposit {
  id: number;
  contract_number: string;
  tenant_name: string;
  property_name: string;
  amount: string;
  balance: string;
  currency?: string;
}

export default function DepositsPage() {
  const [deposits, setDeposits] = useState<Deposit[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedTenants, setSelectedTenants] = useState<number[]>([]);
  const [tenants, setTenants] = useState<{ id: number; name: string }[]>([]);
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

      {/* Фильтры */}
      <div className="bg-white p-3 rounded-lg shadow mb-4">
        <div className="flex items-end gap-3">
          <div className="flex-shrink-0">
            <label className="block text-xs font-medium text-gray-700 mb-1">Период</label>
            <PeriodFilterBar
              value={dateFilter}
              onChange={setDateFilter}
              urlParamPrefix="created_at"
            />
          </div>
          <div className="flex-1 min-w-[200px]">
            <label className="block text-xs font-medium text-gray-700 mb-1">Контрагент</label>
            <CounterpartyFilter
              counterparts={tenants}
              selected={selectedTenants}
              onChange={setSelectedTenants}
            />
          </div>
        </div>
      </div>

      <div className="bg-white shadow rounded-lg overflow-hidden">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 tracking-wider">
                Договор
              </th>
              <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 tracking-wider">
                Арендатор
              </th>
              <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 tracking-wider">
                Сумма депозита
              </th>
              <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 tracking-wider">
                Остаток
              </th>
              <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 tracking-wider">
                Действия
              </th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {deposits.map((deposit, index) => (
              <tr key={deposit.id} className={index % 2 === 0 ? 'bg-white' : 'bg-primary-50'}>
                <td className="px-4 py-2 whitespace-nowrap text-sm font-medium text-gray-900">
                  {deposit.contract_number}
                </td>
                <td className="px-4 py-2 whitespace-nowrap text-sm text-gray-500">
                  {deposit.tenant_name}
                </td>
                <td className="px-4 py-2 whitespace-nowrap text-sm text-gray-500">
                  {formatAmount(deposit.amount)} {deposit.currency || 'сом'}
                </td>
                <td className="px-4 py-2 whitespace-nowrap text-sm font-medium text-gray-900">
                  {formatAmount(deposit.balance)} {deposit.currency || 'сом'}
                </td>
                <td className="px-4 py-2 whitespace-nowrap text-sm text-gray-500">
                  <button
                    onClick={() => handleDelete(deposit)}
                    className="text-red-600 hover:text-red-900"
                  >
                    Удалить
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
