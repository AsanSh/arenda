import React, { useState, useEffect } from 'react';
import { PlusIcon, ArrowRightIcon } from '@heroicons/react/24/outline';
import { useNavigate } from 'react-router-dom';
import client from '../api/client';
import Drawer from '../components/Drawer';
import ContractForm from '../components/ContractForm';
import TableActions from '../components/TableActions';
import { formatCurrency } from '../utils/currency';
import PeriodFilterBar from '../components/PeriodFilterBar';
import CounterpartyFilter from '../components/CounterpartyFilter';
import { DatePreset } from '../utils/datePresets';

interface Contract {
  id: number;
  number: string;
  signed_at: string;
  property_name: string;
  tenant_name: string;
  start_date: string;
  end_date: string;
  rent_amount: string;
  currency: string;
  deposit_enabled: boolean;
  advance_enabled: boolean;
  status: string;
}

export default function ContractsPage() {
  const [contracts, setContracts] = useState<Contract[]>([]);
  const [loading, setLoading] = useState(true);
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const [editingContract, setEditingContract] = useState<{
    id: number;
    signed_at: string;
    property: number;
    tenant: number;
    start_date: string;
    end_date: string;
    rent_amount: string;
    currency: string;
    exchange_rate_source: string;
    due_day: number;
    deposit_enabled: boolean;
    deposit_amount: string;
    advance_enabled: boolean;
    advance_months: number;
    status: string;
    comment: string;
  } | null>(null);
  const navigate = useNavigate();
  const [filters, setFilters] = useState({
    status: '',
    search: '',
  });
  const [tenants, setTenants] = useState<{ id: number; name: string }[]>([]);
  const [selectedTenants, setSelectedTenants] = useState<number[]>([]);
  const [dateFilter, setDateFilter] = useState<{ preset: DatePreset | null; from: string | null; to: string | null }>({
    preset: null,
    from: null,
    to: null,
  });

  useEffect(() => {
    fetchContracts();
    fetchTenants();
  }, [filters, selectedTenants, dateFilter]);

  const fetchTenants = async () => {
    try {
      const response = await client.get('/tenants/');
      setTenants(response.data.results || response.data || []);
    } catch (error) {
      console.error('Error fetching tenants:', error);
    }
  };

  const fetchContracts = async () => {
    try {
      let url = '/contracts/';
      const params = new URLSearchParams();
      
      if (filters.status) params.append('status', filters.status);
      if (filters.search) params.append('search', filters.search);
      
      if (selectedTenants.length > 0) {
        selectedTenants.forEach(id => params.append('tenant', id.toString()));
      }
      
      if (dateFilter.from) params.append('signed_at__gte', dateFilter.from);
      if (dateFilter.to) params.append('signed_at__lte', dateFilter.to);
      
      if (params.toString()) {
        url += `?${params.toString()}`;
      }
      
      const response = await client.get(url);
      setContracts(response.data.results || response.data);
      setLoading(false);
    } catch (error) {
      console.error('Error fetching contracts:', error);
      setLoading(false);
    }
  };

  const handleSave = () => {
    setIsDrawerOpen(false);
    setEditingContract(null);
    fetchContracts();
  };

  const handleEdit = async (contract: Contract) => {
    // Загружаем полные данные договора для редактирования
    try {
      const response = await client.get(`/contracts/${contract.id}/`);
      const fullContract = response.data;
      setEditingContract({
        id: fullContract.id,
        signed_at: fullContract.signed_at,
        property: fullContract.property,
        tenant: fullContract.tenant,
        start_date: fullContract.start_date,
        end_date: fullContract.end_date,
        rent_amount: fullContract.rent_amount,
        currency: fullContract.currency,
        exchange_rate_source: fullContract.exchange_rate_source,
        due_day: fullContract.due_day,
        deposit_enabled: fullContract.deposit_enabled,
        deposit_amount: fullContract.deposit_amount || '',
        advance_enabled: fullContract.advance_enabled,
        advance_months: fullContract.advance_months || 1,
        status: fullContract.status || 'draft',
        comment: fullContract.comment || '',
      });
      setIsDrawerOpen(true);
    } catch (error) {
      console.error('Error fetching contract details:', error);
    }
  };

  const handleDelete = async (contract: Contract) => {
    if (!window.confirm(`Вы уверены, что хотите удалить договор "${contract.number}" и все связанные операции (начисления, платежи, депозиты)? Это действие нельзя отменить.`)) {
      return;
    }

    try {
      const response = await client.delete(`/contracts/${contract.id}/`);
      if (response.data?.message) {
        alert(response.data.message);
      } else {
        alert('Договор и все связанные операции успешно удалены');
      }
      fetchContracts();
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
        <div>
          <h1 className="text-3xl font-bold text-slate-900">Договоры</h1>
          <p className="mt-1 text-sm text-slate-500">Управление договорами аренды</p>
        </div>
        <button
          onClick={() => {
            setEditingContract(null);
            setIsDrawerOpen(true);
          }}
          className="flex items-center px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700"
        >
          <PlusIcon className="h-5 w-5 mr-2" />
          Добавить договор
        </button>
      </div>

      {/* Фильтры */}
      <div className="bg-white p-3 rounded-lg shadow mb-4">
        <div className="flex items-end gap-3">
          <div className="flex-shrink-0">
            <label className="block text-xs font-medium text-gray-700 mb-1">Период</label>
            <PeriodFilterBar
              value={dateFilter}
              onChange={setDateFilter}
              urlParamPrefix="signed_at"
            />
          </div>
          <div className="flex-shrink-0 min-w-[180px]">
            <label className="block text-xs font-medium text-gray-700 mb-1">Контрагент</label>
            <CounterpartyFilter
              counterparts={tenants}
              selected={selectedTenants}
              onChange={setSelectedTenants}
            />
          </div>
          <div className="flex-shrink-0 min-w-[120px]">
            <label className="block text-xs font-medium text-gray-700 mb-1">Статус</label>
            <select
              value={filters.status}
              onChange={(e) => setFilters({ ...filters, status: e.target.value })}
              className="w-full px-2 py-1 text-xs border border-gray-300 rounded focus:ring-primary-500 focus:border-primary-500"
            >
              <option value="">Все</option>
              <option value="draft">Черновик</option>
              <option value="active">Активен</option>
              <option value="ended">Завершен</option>
            </select>
          </div>
          <div className="flex-1 min-w-[200px]">
            <label className="block text-xs font-medium text-gray-700 mb-1">Поиск</label>
            <input
              type="text"
              placeholder="№ договора, объект..."
              value={filters.search}
              onChange={(e) => setFilters({ ...filters, search: e.target.value })}
              className="w-full px-2 py-1 text-xs border border-gray-300 rounded focus:ring-primary-500 focus:border-primary-500"
            />
          </div>
        </div>
      </div>

      <div className="bg-white shadow rounded-lg overflow-hidden">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 tracking-wider">
                № договора
              </th>
              <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 tracking-wider">
                Объект
              </th>
              <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 tracking-wider">
                Арендатор
              </th>
              <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 tracking-wider">
                Период
              </th>
              <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 tracking-wider">
                Ставка
              </th>
              <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 tracking-wider">
                Статус
              </th>
              <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 tracking-wider">
                Действия
              </th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {contracts.map((contract, index) => (
              <tr key={contract.id} className={index % 2 === 0 ? 'bg-white' : 'bg-primary-50'}>
                <td className="px-4 py-2 whitespace-nowrap text-sm font-medium text-gray-900">
                  {contract.number}
                </td>
                <td className="px-4 py-2 whitespace-nowrap text-sm text-gray-500">
                  {contract.property_name}
                </td>
                <td className="px-4 py-2 whitespace-nowrap text-sm text-gray-500">
                  {contract.tenant_name}
                </td>
                <td className="px-4 py-2 whitespace-nowrap text-sm text-gray-500">
                  <span className="text-slate-600">
                    {new Date(contract.start_date).toLocaleDateString('ru-RU')}
                  </span>
                  <ArrowRightIcon className="h-3 w-3 inline mx-1 text-slate-400" />
                  <span className="text-slate-600">
                    {new Date(contract.end_date).toLocaleDateString('ru-RU')}
                  </span>
                </td>
                <td className="px-4 py-2 whitespace-nowrap text-sm text-gray-500">
                  {formatCurrency(contract.rent_amount, contract.currency)}
                </td>
                <td className="px-4 py-2 whitespace-nowrap">
                  <span className={`px-2 py-1 text-xs rounded-full ${
                    contract.status === 'active' ? 'bg-green-100 text-green-800' :
                    contract.status === 'ended' ? 'bg-gray-100 text-gray-800' :
                    'bg-yellow-100 text-yellow-800'
                  }`}>
                    {contract.status}
                  </span>
                </td>
                <td className="px-4 py-2 whitespace-nowrap text-sm text-gray-500">
                  <TableActions
                    onView={() => navigate(`/contracts/${contract.id}`)}
                    onEdit={() => handleEdit(contract)}
                    onDelete={() => handleDelete(contract)}
                  />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <Drawer
        isOpen={isDrawerOpen}
        onClose={() => {
          setIsDrawerOpen(false);
          setEditingContract(null);
        }}
        title={editingContract ? 'Редактировать договор' : 'Добавить договор'}
      >
        <ContractForm
          contract={editingContract}
          onSave={handleSave}
          onCancel={() => {
            setIsDrawerOpen(false);
            setEditingContract(null);
          }}
        />
      </Drawer>
    </div>
  );
}
