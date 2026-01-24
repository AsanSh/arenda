import React, { useState, useEffect, useCallback } from 'react';
import { Plus, ArrowRight, Search, ChevronUp, ChevronDown } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import client from '../api/client';
import Drawer from '../components/Drawer';
import ContractForm from '../components/ContractForm';
import ActionsMenu from '../components/ui/ActionsMenu';
import { formatCurrency } from '../utils/currency';
import PeriodFilterBar from '../components/PeriodFilterBar';
import CounterpartyFilter from '../components/CounterpartyFilter';
import { useDensity } from '../contexts/DensityContext';
import { useUser } from '../contexts/UserContext';
import { useCompactStyles } from '../hooks/useCompactStyles';
import { DatePreset } from '../utils/datePresets';

type SortField = 'number' | 'property_name' | 'tenant_name' | 'start_date' | 'rent_amount' | 'status';
type SortDirection = 'asc' | 'desc';

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
  const { isCompact } = useDensity();
  const { user, canWrite } = useUser();
  const compact = useCompactStyles();
  const canEdit = canWrite('contracts');
  // Арендаторы не могут добавлять/редактировать договоры
  const isTenant = user?.role === 'tenant';
  const canAddContract = !isTenant && (user?.is_admin || user?.is_staff || canEdit);
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
  const [sortField, setSortField] = useState<SortField | null>(null);
  const [sortDirection, setSortDirection] = useState<SortDirection>('asc');
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
  }, [filters, selectedTenants, dateFilter, sortField, sortDirection]);

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
      
      // Сортировка
      if (sortField) {
        const ordering = sortDirection === 'desc' ? `-${sortField}` : sortField;
        params.append('ordering', ordering);
      }
      
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

  const [formLoading, setFormLoading] = useState(false);

  const handleSubmit = useCallback(async (data: any) => {
    setFormLoading(true);
    try {
      if (editingContract?.id) {
        await client.patch(`/contracts/${editingContract.id}/`, data);
      } else {
        await client.post('/contracts/', data);
      }
      setIsDrawerOpen(false);
      setEditingContract(null);
      fetchContracts();
    } catch (error: any) {
      console.error('Error saving contract:', error);
      const errorMessage = error?.response?.data?.detail || error?.response?.data?.error || 'Ошибка при сохранении';
      alert(errorMessage);
    } finally {
      setFormLoading(false);
    }
  }, [editingContract]);

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

  const handleProlongate = async (contract: Contract) => {
    // Загружаем полные данные договора для пролонгации
    try {
      const response = await client.get(`/contracts/${contract.id}/`);
      const fullContract = response.data;
      
      // Предлагаем новую дату окончания (продлеваем на тот же период)
      const startDate = new Date(fullContract.start_date);
      const endDate = new Date(fullContract.end_date);
      const periodDays = Math.ceil((endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24));
      const newEndDate = new Date(endDate);
      newEndDate.setDate(newEndDate.getDate() + periodDays);
      
      const newEndDateStr = newEndDate.toISOString().split('T')[0];
      
      setEditingContract({
        id: fullContract.id,
        signed_at: fullContract.signed_at,
        property: fullContract.property,
        tenant: fullContract.tenant,
        start_date: fullContract.end_date, // Новая дата начала = старая дата окончания
        end_date: newEndDateStr,
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
      console.error('Error fetching contract details for prolongation:', error);
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

  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortDirection('asc');
    }
  };

  const getSortIcon = (field: SortField) => {
    if (sortField !== field) return null;
    return sortDirection === 'asc' ? (
      <ChevronUp className="h-3 w-3 inline-block ml-1" />
    ) : (
      <ChevronDown className="h-3 w-3 inline-block ml-1" />
    );
  };

  if (loading) {
    return <div className="text-center py-12">Загрузка...</div>;
  }

  return (
    <div>
      <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-3 mb-4 md:mb-6">
        <div>
          <h1 className={compact.sectionHeader + ' text-slate-900'}>Договоры</h1>
          <p className="mt-1 text-xs md:text-sm text-slate-500">Управление договорами аренды</p>
        </div>
        {canAddContract && (
          <button
            onClick={() => {
              setEditingContract(null);
              setIsDrawerOpen(true);
            }}
            className="flex items-center px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700"
          >
            <Plus className="h-5 w-5 mr-2" />
            Добавить договор
          </button>
        )}
      </div>

      {/* Поиск - сверху отдельно */}
      <div className="bg-white p-2 rounded-lg shadow-sm border border-gray-200 mb-3">
        <div className="relative">
          <Search className="absolute left-2 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
          <input
            type="text"
            placeholder="№ договора, объект..."
            value={filters.search}
            onChange={(e) => setFilters({ ...filters, search: e.target.value })}
            className="w-full pl-8 pr-3 py-1.5 text-sm border border-gray-300 rounded focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
          />
        </div>
      </div>

      {/* Фильтры в виде вкладок */}
      <div className="bg-white p-2 rounded-lg shadow-sm border border-gray-200 mb-3">
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-xs font-medium text-gray-700 mr-1">Показать:</span>
          <button
            onClick={() => setFilters({ ...filters, status: '' })}
            className={`px-3 py-1 text-xs font-medium rounded transition-colors ${
              !filters.status
                ? 'bg-indigo-600 text-white'
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
          >
            Все договоры
          </button>
          <button
            onClick={() => setFilters({ ...filters, status: 'active' })}
            className={`px-3 py-1 text-xs font-medium rounded transition-colors ${
              filters.status === 'active'
                ? 'bg-indigo-600 text-white'
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
          >
            Активные
          </button>
          <button
            onClick={() => setFilters({ ...filters, status: 'draft' })}
            className={`px-3 py-1 text-xs font-medium rounded transition-colors ${
              filters.status === 'draft'
                ? 'bg-indigo-600 text-white'
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
          >
            Черновики
          </button>
          <button
            onClick={() => setFilters({ ...filters, status: 'ended' })}
            className={`px-3 py-1 text-xs font-medium rounded transition-colors ${
              filters.status === 'ended'
                ? 'bg-indigo-600 text-white'
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
          >
            Завершенные
          </button>
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
              urlParamPrefix="signed_at"
            />
          </div>
        </div>
      </div>

      <div className="bg-white shadow rounded-lg overflow-hidden">
        <div className="overflow-x-auto -mx-4 md:mx-0">
          <div className="inline-block min-w-full align-middle">
            <table className="min-w-full divide-y divide-gray-100">
          <thead className="bg-gray-50">
            <tr>
              <th 
                className={`${isCompact ? 'px-1 py-0.5' : 'px-2 py-1'} text-left text-xs font-medium text-gray-500 tracking-wider leading-none cursor-pointer hover:bg-gray-100 transition-colors`}
                onClick={() => handleSort('number')}
              >
                № договора {getSortIcon('number')}
              </th>
              <th 
                className={`${isCompact ? 'px-1 py-0.5' : 'px-2 py-1'} text-left text-xs font-medium text-gray-500 tracking-wider leading-none cursor-pointer hover:bg-gray-100 transition-colors`}
                onClick={() => handleSort('property_name')}
              >
                Объект {getSortIcon('property_name')}
              </th>
              <th 
                className={`${isCompact ? 'px-1 py-0.5' : 'px-2 py-1'} text-left text-xs font-medium text-gray-500 tracking-wider leading-none cursor-pointer hover:bg-gray-100 transition-colors`}
                onClick={() => handleSort('tenant_name')}
              >
                Арендатор {getSortIcon('tenant_name')}
              </th>
              <th 
                className={`${isCompact ? 'px-1 py-0.5' : 'px-2 py-1'} text-left text-xs font-medium text-gray-500 tracking-wider leading-none cursor-pointer hover:bg-gray-100 transition-colors`}
                onClick={() => handleSort('start_date')}
              >
                Период {getSortIcon('start_date')}
              </th>
              <th 
                className={`${isCompact ? 'px-1 py-0.5' : 'px-2 py-1'} text-left text-xs font-medium text-gray-500 tracking-wider leading-none cursor-pointer hover:bg-gray-100 transition-colors`}
                onClick={() => handleSort('rent_amount')}
              >
                Ставка {getSortIcon('rent_amount')}
              </th>
              <th 
                className={`${isCompact ? 'px-1 py-0.5' : 'px-2 py-1'} text-left text-xs font-medium text-gray-500 tracking-wider leading-none cursor-pointer hover:bg-gray-100 transition-colors`}
                onClick={() => handleSort('status')}
              >
                Статус {getSortIcon('status')}
              </th>
              <th className={`${isCompact ? 'px-1 py-0.5' : 'px-2 py-1'} text-right text-xs font-medium text-gray-500 tracking-wider leading-none`}>
                Действия
              </th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-100">
            {contracts.map((contract, index) => (
              <tr key={contract.id} className={`${index % 2 === 0 ? 'bg-white' : 'bg-primary-50'} leading-none`}>
                <td className={`${isCompact ? 'px-1 py-0' : 'px-2 py-0.5'} whitespace-nowrap text-xs font-medium text-gray-900 leading-tight`}>
                  {contract.number}
                </td>
                <td className={`${isCompact ? 'px-1 py-0' : 'px-2 py-0.5'} whitespace-nowrap text-xs text-gray-500 leading-tight`}>
                  {contract.property_name}
                </td>
                <td className={`${isCompact ? 'px-1 py-0' : 'px-2 py-0.5'} whitespace-nowrap text-xs text-gray-500 leading-tight`}>
                  {contract.tenant_name}
                </td>
                <td className={`${isCompact ? 'px-1 py-0' : 'px-2 py-0.5'} whitespace-nowrap text-xs text-gray-500 leading-tight`}>
                  <span className="text-slate-600">
                    {new Date(contract.start_date).toLocaleDateString('ru-RU')}
                  </span>
                  <ArrowRight className="h-3 w-3 inline mx-1 text-slate-400" />
                  <span className="text-slate-600">
                    {new Date(contract.end_date).toLocaleDateString('ru-RU')}
                  </span>
                </td>
                <td className={`${isCompact ? 'px-1 py-0' : 'px-2 py-0.5'} whitespace-nowrap text-xs text-gray-500 leading-tight`}>
                  {formatCurrency(contract.rent_amount, contract.currency)}
                </td>
                <td className={`${isCompact ? 'px-1 py-0' : 'px-2 py-0.5'} whitespace-nowrap leading-tight`}>
                  <span className={`${isCompact ? 'px-1 py-0' : 'px-1.5 py-0.5'} text-xs rounded-full leading-none ${
                    contract.status === 'active' ? 'bg-green-100 text-green-800' :
                    contract.status === 'ended' ? 'bg-gray-100 text-gray-800' :
                    'bg-yellow-100 text-yellow-800'
                  }`}>
                    {contract.status}
                  </span>
                </td>
                <td className={`${isCompact ? 'px-1 py-0' : 'px-2 py-0.5'} whitespace-nowrap text-right leading-tight`}>
                  <div className="flex justify-end items-center gap-2">
                    {canEdit && (
                      <button
                        onClick={() => handleEdit(contract)}
                        className="px-2 py-1 text-xs font-medium text-indigo-600 bg-indigo-50 rounded hover:bg-indigo-100 transition-colors"
                        title="Редактировать"
                      >
                        Редактировать
                      </button>
                    )}
                    <ActionsMenu
                      items={[
                        { label: 'Просмотр', onClick: () => navigate(`/contracts/${contract.id}`), icon: <ArrowRight className="h-4 w-4" /> },
                        ...(canEdit ? [
                          { label: 'Пролонгировать', onClick: () => handleProlongate(contract) },
                          { label: 'Удалить', onClick: () => handleDelete(contract), variant: 'danger' as const },
                        ] : []),
                      ]}
                      alwaysVisible={true}
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

      <Drawer
        isOpen={isDrawerOpen}
        onClose={() => {
          setIsDrawerOpen(false);
          setEditingContract(null);
        }}
        title={(() => {
          if (!editingContract) return 'Добавить договор';
          const originalContract = contracts.find(c => c.id === editingContract.id);
          if (originalContract && new Date(editingContract.start_date) > new Date(originalContract.end_date)) {
            return 'Пролонгировать договор';
          }
          return 'Редактировать договор';
        })()}
        footer={
          <div className="flex gap-3 justify-end">
            <button
              type="button"
              onClick={() => {
                setIsDrawerOpen(false);
                setEditingContract(null);
              }}
              className="px-4 py-2 text-sm font-medium text-slate-700 bg-white border border-slate-300 rounded-card hover:bg-slate-50 transition-colors"
            >
              Отмена
            </button>
            <button
              type="submit"
              form="contract-form"
              disabled={formLoading}
              className="px-4 py-2 text-sm font-medium text-white bg-indigo-600 rounded-card hover:bg-indigo-700 transition-colors disabled:opacity-50"
            >
              {formLoading ? 'Сохранение...' : 'Сохранить'}
            </button>
          </div>
        }
      >
        <ContractForm
          contract={editingContract}
          onSubmit={handleSubmit}
          loading={formLoading}
          isProlongation={(() => {
            if (!editingContract) return false;
            const originalContract = contracts.find(c => c.id === editingContract.id);
            if (!originalContract) return false;
            return new Date(editingContract.start_date) > new Date(originalContract.end_date);
          })()}
        />
      </Drawer>
    </div>
  );
}
