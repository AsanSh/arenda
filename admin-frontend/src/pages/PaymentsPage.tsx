import React, { useState, useEffect, useMemo } from 'react';
import { Search } from 'lucide-react';
import client from '../api/client';
import { formatAmount, formatCurrency } from '../utils/currency';
import PeriodFilterBar from '../components/PeriodFilterBar';
import CounterpartyFilter from '../components/CounterpartyFilter';
import ActionsMenu from '../components/ui/ActionsMenu';
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
  const [searchQuery, setSearchQuery] = useState('');
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

      {/* Поиск - сверху отдельно */}
      <div className="bg-white p-2 rounded-lg shadow-sm border border-gray-200 mb-3">
        <div className="relative">
          <Search className="absolute left-2 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
          <input
            type="text"
            placeholder="№ договора, арендатор..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
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
              urlParamPrefix="payment_date"
            />
          </div>
        </div>
      </div>

      {/* KPI метрики */}
      <div className="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-4 gap-2 md:gap-4 mb-4 md:mb-6">
        <div 
          className="bg-white p-4 rounded-card shadow-medium border border-slate-200 cursor-pointer hover:border-indigo-300 hover:shadow-large transition-all"
        >
          <h3 className="text-xs font-medium text-slate-500 uppercase tracking-wide mb-1">Итого поступлений</h3>
          <p className="text-2xl font-bold text-slate-900">
            {formatCurrency(kpiMetrics.totalAmount.toString(), 'KGS')}
          </p>
        </div>
        <div 
          className="bg-white p-4 rounded-card shadow-medium border border-slate-200 cursor-pointer hover:border-green-300 hover:shadow-large transition-all"
        >
          <h3 className="text-xs font-medium text-slate-500 uppercase tracking-wide mb-1">Итого распределено</h3>
          <p className="text-2xl font-bold text-green-600">
            {formatCurrency(kpiMetrics.totalAllocated.toString(), 'KGS')}
          </p>
        </div>
        <div 
          className="bg-white p-4 rounded-card shadow-medium border border-slate-200 cursor-pointer hover:border-orange-300 hover:shadow-large transition-all"
        >
          <h3 className="text-xs font-medium text-slate-500 uppercase tracking-wide mb-1">Нераспределено</h3>
          <p className="text-2xl font-bold text-orange-600">
            {formatCurrency(kpiMetrics.totalUnallocated.toString(), 'KGS')}
          </p>
        </div>
        <div 
          className="bg-white p-4 rounded-card shadow-medium border border-slate-200 cursor-pointer hover:border-blue-300 hover:shadow-large transition-all"
        >
          <h3 className="text-xs font-medium text-slate-500 uppercase tracking-wide mb-1">Количество платежей</h3>
          <p className="text-2xl font-bold text-blue-600">
            {kpiMetrics.paymentsCount}
          </p>
        </div>
      </div>

      <div className="bg-white shadow rounded-lg overflow-hidden">
        <div className="overflow-x-auto -mx-4 md:mx-0">
          <div className="inline-block min-w-full align-middle">
            <table className="min-w-full divide-y divide-gray-100">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-2 py-1 text-left text-xs font-medium text-gray-500 tracking-wider leading-none">
                Дата
              </th>
              <th className="px-2 py-1 text-left text-xs font-medium text-gray-500 tracking-wider leading-none">
                Сумма
              </th>
              <th className="px-2 py-1 text-left text-xs font-medium text-gray-500 tracking-wider leading-none">
                Договор
              </th>
              <th className="px-2 py-1 text-left text-xs font-medium text-gray-500 tracking-wider leading-none">
                Арендатор
              </th>
              <th className="px-2 py-1 text-left text-xs font-medium text-gray-500 tracking-wider leading-none">
                Счет
              </th>
              <th className="px-2 py-1 text-left text-xs font-medium text-gray-500 tracking-wider leading-none">
                Распределено
              </th>
              <th className="px-2 py-1 text-left text-xs font-medium text-gray-500 tracking-wider leading-none">
                Действия
              </th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-100">
            {payments.filter(p => !searchQuery || p.contract_number.toLowerCase().includes(searchQuery.toLowerCase()) || p.tenant_name.toLowerCase().includes(searchQuery.toLowerCase())).map((payment, index) => (
              <tr key={payment.id} className={`${index % 2 === 0 ? 'bg-white' : 'bg-primary-50'} leading-none`}>
                <td className="px-2 py-0.5 whitespace-nowrap text-xs text-gray-500 leading-tight">
                  {new Date(payment.payment_date).toLocaleDateString('ru-RU')}
                </td>
                <td className="px-2 py-0.5 whitespace-nowrap text-xs font-medium text-gray-900 leading-tight">
                  {formatAmount(payment.amount)} {payment.currency || 'сом'}
                </td>
                <td className="px-2 py-0.5 whitespace-nowrap text-xs text-gray-500 leading-tight">
                  {payment.contract_number}
                </td>
                <td className="px-2 py-0.5 whitespace-nowrap text-xs text-gray-500 leading-tight">
                  {payment.tenant_name}
                </td>
                <td className="px-2 py-0.5 whitespace-nowrap text-xs text-gray-500 leading-tight">
                  {payment.account_name || '-'}
                </td>
                <td className="px-2 py-0.5 whitespace-nowrap text-xs text-gray-500 leading-tight">
                  {formatAmount(payment.allocated_amount)} {payment.currency || 'сом'}
                </td>
                <td className="px-2 py-0.5 whitespace-nowrap text-right leading-tight">
                  <div className="flex justify-end group">
                    <ActionsMenu
                      items={[
                        { label: 'Редактировать', onClick: () => {/* TODO: добавить редактирование */} },
                        { label: payment.is_returned ? 'Отменить возврат' : 'Вернуть', onClick: () => handleReturn(payment) },
                        { label: 'Удалить', onClick: () => handleDelete(payment), variant: 'danger' },
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
