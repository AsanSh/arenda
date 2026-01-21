import React, { useState, useEffect, useMemo } from 'react';
import client from '../api/client';
import { formatAmount, formatCurrency } from '../utils/currency';
import PeriodFilterBar from '../components/PeriodFilterBar';
import CounterpartyFilter from '../components/CounterpartyFilter';
import { DatePreset } from '../utils/datePresets';

interface Payment {
  id: number;
  contract_number: string;
  tenant_name: string;
  property_name: string;
  amount: string;
  payment_date: string;
  allocated_amount: string;
  comment: string;
  currency?: string;
  account?: number;
  account_name?: string;
  is_returned?: boolean;
}

export default function PaymentsPage() {
  const [payments, setPayments] = useState<Payment[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedTenants, setSelectedTenants] = useState<number[]>([]);
  const [tenants, setTenants] = useState<{ id: number; name: string }[]>([]);
  const [dateFilter, setDateFilter] = useState<{ preset: DatePreset | null; from: string | null; to: string | null }>({
    preset: null,
    from: null,
    to: null,
  });

  useEffect(() => {
    fetchPayments();
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

  const fetchPayments = async () => {
    try {
      let url = '/payments/';
      const params = new URLSearchParams();
      
      if (selectedTenants.length > 0) {
        selectedTenants.forEach(id => params.append('contract__tenant', id.toString()));
      }
      
      if (dateFilter.from) params.append('payment_date__gte', dateFilter.from);
      if (dateFilter.to) params.append('payment_date__lte', dateFilter.to);
      
      if (params.toString()) {
        url += `?${params.toString()}`;
      }
      
      const response = await client.get(url);
      setPayments(response.data.results || response.data);
      setLoading(false);
    } catch (error) {
      console.error('Error fetching payments:', error);
      setLoading(false);
    }
  };

  const handleDelete = async (payment: Payment) => {
    if (!window.confirm(`Вы уверены, что хотите удалить поступление от ${new Date(payment.payment_date).toLocaleDateString('ru-RU')} на сумму ${formatAmount(payment.amount)} ${payment.currency || 'сом'}? Это действие нельзя отменить.`)) {
      return;
    }

    try {
      await client.delete(`/payments/${payment.id}/`);
      fetchPayments();
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

  const handleReturn = async (payment: Payment) => {
    if (!window.confirm(`Вы уверены, что хотите вернуть поступление от ${new Date(payment.payment_date).toLocaleDateString('ru-RU')} на сумму ${formatAmount(payment.amount)} ${payment.currency || 'сом'}? Сумма будет возвращена в начисления, но платеж останется в системе с пометкой "Возвращен".`)) {
      return;
    }

    try {
      const response = await client.post(`/payments/${payment.id}/return_payment/`);
      alert(response.data.status || 'Платеж возвращен');
      fetchPayments();
    } catch (error: any) {
      let errorMessage = 'Ошибка при возврате платежа';
      if (error.response?.data) {
        if (error.response.data.detail) {
          errorMessage = error.response.data.detail;
        } else if (error.response.data.error) {
          errorMessage = error.response.data.error;
        } else if (typeof error.response.data === 'string') {
          errorMessage = error.response.data;
        }
      }
      alert(errorMessage);
    }
  };

  // Вычисляем KPI метрики
  const kpiMetrics = useMemo(() => {
    const totalAmount = payments.reduce((sum, p) => sum + parseFloat(p.amount || '0'), 0);
    const totalAllocated = payments.reduce((sum, p) => sum + parseFloat(p.allocated_amount || '0'), 0);
    const totalUnallocated = totalAmount - totalAllocated;
    const paymentsCount = payments.length;
    
    return {
      totalAmount,
      totalAllocated,
      totalUnallocated,
      paymentsCount
    };
  }, [payments]);

  if (loading) {
    return <div className="text-center py-12">Загрузка...</div>;
  }

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Поступления</h1>
      </div>

      {/* Фильтры */}
      <div className="bg-white p-3 rounded-lg shadow mb-4">
        <div className="flex items-end gap-3">
          <div className="flex-shrink-0">
            <label className="block text-xs font-medium text-gray-700 mb-1">Период</label>
            <PeriodFilterBar
              value={dateFilter}
              onChange={setDateFilter}
              urlParamPrefix="payment_date"
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

      {/* KPI метрики */}
      <div className="grid grid-cols-4 gap-6 mb-6">
        <div className="bg-white p-6 rounded-lg shadow">
          <h3 className="text-sm font-medium text-gray-500 mb-2">Итого поступлений</h3>
          <p className="text-3xl font-bold text-gray-900">
            {formatCurrency(kpiMetrics.totalAmount.toString(), 'KGS')}
          </p>
        </div>
        <div className="bg-white p-6 rounded-lg shadow">
          <h3 className="text-sm font-medium text-gray-500 mb-2">Итого распределено</h3>
          <p className="text-3xl font-bold text-green-600">
            {formatCurrency(kpiMetrics.totalAllocated.toString(), 'KGS')}
          </p>
        </div>
        <div className="bg-white p-6 rounded-lg shadow">
          <h3 className="text-sm font-medium text-gray-500 mb-2">Нераспределено</h3>
          <p className="text-3xl font-bold text-orange-600">
            {formatCurrency(kpiMetrics.totalUnallocated.toString(), 'KGS')}
          </p>
        </div>
        <div className="bg-white p-6 rounded-lg shadow">
          <h3 className="text-sm font-medium text-gray-500 mb-2">Количество платежей</h3>
          <p className="text-3xl font-bold text-blue-600">
            {kpiMetrics.paymentsCount}
          </p>
        </div>
      </div>

      <div className="bg-white shadow rounded-lg overflow-hidden">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 tracking-wider">
                Дата
              </th>
              <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 tracking-wider">
                Сумма
              </th>
              <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 tracking-wider">
                Договор
              </th>
              <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 tracking-wider">
                Арендатор
              </th>
              <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 tracking-wider">
                Счет
              </th>
              <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 tracking-wider">
                Распределено
              </th>
              <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 tracking-wider">
                Действия
              </th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {payments.map((payment, index) => (
              <tr key={payment.id} className={index % 2 === 0 ? 'bg-white' : 'bg-primary-50'}>
                <td className="px-4 py-2 whitespace-nowrap text-sm text-gray-500">
                  {new Date(payment.payment_date).toLocaleDateString('ru-RU')}
                </td>
                <td className="px-4 py-2 whitespace-nowrap text-sm font-medium text-gray-900">
                  {formatAmount(payment.amount)} {payment.currency || 'сом'}
                </td>
                <td className="px-4 py-2 whitespace-nowrap text-sm text-gray-500">
                  {payment.contract_number}
                </td>
                <td className="px-4 py-2 whitespace-nowrap text-sm text-gray-500">
                  {payment.tenant_name}
                </td>
                <td className="px-4 py-2 whitespace-nowrap text-sm text-gray-500">
                  {payment.account_name || '-'}
                </td>
                <td className="px-4 py-2 whitespace-nowrap text-sm text-gray-500">
                  {formatAmount(payment.allocated_amount)} {payment.currency || 'сом'}
                </td>
                <td className="px-4 py-2 whitespace-nowrap text-sm text-gray-500">
                  <div className="flex items-center gap-3">
                    {payment.is_returned ? (
                      <span className="px-2 py-1 text-xs rounded-full bg-gray-100 text-gray-800">
                        Возвращен
                      </span>
                    ) : (
                      <>
                        <button
                          onClick={() => handleReturn(payment)}
                          className="text-orange-600 hover:text-orange-900 text-xs"
                        >
                          Вернуть
                        </button>
                        <button
                          onClick={() => handleDelete(payment)}
                          className="text-red-600 hover:text-red-900 text-xs"
                        >
                          Удалить
                        </button>
                      </>
                    )}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
