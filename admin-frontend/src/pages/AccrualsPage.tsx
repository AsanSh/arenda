import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { PlusIcon, ChevronDownIcon, ChevronRightIcon, CheckCircleIcon } from '@heroicons/react/24/outline';
import { Search } from 'lucide-react';
import { useSearchParams } from 'react-router-dom';
import client from '../api/client';
import { formatAmount } from '../utils/currency';
import Drawer from '../components/Drawer';
import AccrualForm from '../components/AccrualForm';
import PeriodFilterBar from '../components/PeriodFilterBar';
import CounterpartyFilter from '../components/CounterpartyFilter';
import AcceptPaymentModal from '../components/AcceptPaymentModal';
import BulkAcceptPaymentModal from '../components/BulkAcceptPaymentModal';
import ActionsMenu from '../components/ui/ActionsMenu';
import { DatePreset } from '../utils/datePresets';

interface Accrual {
  id: number;
  contract_number: string;
  property_id?: number;
  property_name: string;
  property_address: string;
  tenant_name: string;
  period_start: string;
  period_end: string;
  due_date: string;
  base_amount: string;
  final_amount: string;
  paid_amount: string;
  balance: string;
  status: string;
  currency?: string;
  utility_type?: string;
  utility_type_display?: string;
  overdue_days?: number;
}

interface PropertyGroup {
  property_id: number;
  property_name: string;
  property_address: string;
  tenant_name: string;
  accruals: Accrual[];
  total_final: number;
  total_paid: number;
  total_balance: number;
  periods_count: number;
  paid_count: number;
  unpaid_count: number;
  overdue_count: number;
  currency: string;
  max_overdue_days: number;
  status: string;
  utility_type_display: string;
}

interface Tenant {
  id: number;
  name: string;
}

export default function AccrualsPage() {
  const [accruals, setAccruals] = useState<Accrual[]>([]);
  const [loading, setLoading] = useState(true);
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const [editingAccrual, setEditingAccrual] = useState<{
    id?: number;
    contract: number;
    period_start: string;
    period_end: string;
    due_date: string;
    base_amount: string;
    adjustments: string;
    utilities_amount: string;
    utility_type: string;
    comment: string;
  } | null>(null);
  
  // Фильтры и сортировка
  const [filters, setFilters] = useState({
    status: '',
    utility_type: '',
    search: '',
  });
  const [tenants, setTenants] = useState<Tenant[]>([]);
  const [selectedTenants, setSelectedTenants] = useState<number[]>([]);
  const [dateFilter, setDateFilter] = useState<{ preset: DatePreset | null; from: string | null; to: string | null }>({
    preset: null,
    from: null,
    to: null,
  });
  const [expandedProperties, setExpandedProperties] = useState<Set<string>>(new Set());
  const [isAcceptModalOpen, setIsAcceptModalOpen] = useState(false);
  const [acceptingAccrual, setAcceptingAccrual] = useState<Accrual | null>(null);
  const [selectedAccruals, setSelectedAccruals] = useState<Set<number>>(new Set());
  const [isBulkAcceptModalOpen, setIsBulkAcceptModalOpen] = useState(false);
  const [isBulkEdit, setIsBulkEdit] = useState(false);

  // KPI агрегаты по текущему списку
  const summaryKPI = useMemo(() => {
    const propertyKeys = new Set<string>();
    let totalFinal = 0;
    let totalPaid = 0;
    let totalBalance = 0;

    accruals.forEach((a) => {
      const key = a.property_id ? `id_${a.property_id}` : `addr_${a.property_address || a.property_name}`;
      propertyKeys.add(key);
      totalFinal += parseFloat(a.final_amount || '0');
      totalPaid += parseFloat(a.paid_amount || '0');
      totalBalance += parseFloat(a.balance || '0');
    });

    return {
      propertiesCount: propertyKeys.size,
      totalFinal,
      totalPaid,
      totalBalance,
    };
  }, [accruals]);

  useEffect(() => {
    fetchAccruals();
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

  const fetchAccruals = async () => {
    try {
      let url = '/accruals/';
      const params = new URLSearchParams();
      
      if (filters.status) params.append('status', filters.status);
      if (filters.utility_type) params.append('utility_type', filters.utility_type);
      if (filters.search) params.append('search', filters.search);
      
      if (selectedTenants.length > 0) {
        selectedTenants.forEach(id => params.append('contract__tenant', id.toString()));
      }
      
      // Добавляем фильтрацию по датам
      if (dateFilter.from) params.append('due_date_from', dateFilter.from);
      if (dateFilter.to) params.append('due_date_to', dateFilter.to);
      
      // Сортировка по умолчанию: по сроку оплаты (по возрастанию - сначала ближайшие)
      params.append('ordering', 'due_date');
      
      if (params.toString()) {
        url += `?${params.toString()}`;
      }
      
      const response = await client.get(url);
      setAccruals(response.data.results || response.data);
      setLoading(false);
    } catch (error) {
      console.error('Error fetching accruals:', error);
      setLoading(false);
    }
  };

  const [formLoading, setFormLoading] = useState(false);

  const handleSubmit = useCallback(async (formData: any) => {
    setFormLoading(true);
    try {
      if (isBulkEdit && selectedAccruals.size > 0) {
        // Массовое редактирование
        const updateData: any = {
          ids: Array.from(selectedAccruals),
        };
        
        // Добавляем только измененные поля
        if (formData.due_date) updateData.due_date = formData.due_date;
        if (formData.base_amount !== undefined) updateData.base_amount = formData.base_amount;
        if (formData.adjustments !== undefined) updateData.adjustments = formData.adjustments;
        if (formData.utilities_amount !== undefined) updateData.utilities_amount = formData.utilities_amount;
        if (formData.utility_type) updateData.utility_type = formData.utility_type;
        if (formData.comment !== undefined) updateData.comment = formData.comment;
        
        if (Object.keys(updateData).length === 1) {
          alert('Нет изменений для сохранения');
          setFormLoading(false);
          return;
        }
        
        const response = await client.post('/accruals/bulk_update/', updateData);
        alert(response.data.status || `Обновлено начислений: ${response.data.updated_count}`);
        setSelectedAccruals(new Set());
        setIsBulkEdit(false);
      } else {
        // Обычное редактирование/создание
        if (editingAccrual?.id) {
          await client.patch(`/accruals/${editingAccrual.id}/`, formData);
        } else {
          await client.post('/accruals/', formData);
        }
      }
      setIsDrawerOpen(false);
      setEditingAccrual(null);
      fetchAccruals();
    } catch (error: any) {
      console.error('Error saving accrual:', error);
      const errorMessage = error?.response?.data?.detail || error?.response?.data?.error || 'Ошибка при сохранении';
      alert(errorMessage);
    } finally {
      setFormLoading(false);
    }
  }, [editingAccrual, isBulkEdit, selectedAccruals]);

  const handleAdd = () => {
    setEditingAccrual(null);
    setIsDrawerOpen(true);
  };


  const handleEdit = async (accrual: Accrual) => {
    // Загружаем полные данные начисления для редактирования
    try {
      const response = await client.get(`/accruals/${accrual.id}/`);
      const fullAccrual = response.data;
      setEditingAccrual({
        id: fullAccrual.id,
        contract: fullAccrual.contract,
        period_start: fullAccrual.period_start,
        period_end: fullAccrual.period_end,
        due_date: fullAccrual.due_date,
        base_amount: fullAccrual.base_amount,
        adjustments: fullAccrual.adjustments || '0',
        utilities_amount: fullAccrual.utilities_amount || '0',
        utility_type: fullAccrual.utility_type || 'rent',
        comment: fullAccrual.comment || '',
      });
      setIsDrawerOpen(true);
    } catch (error) {
      console.error('Error fetching accrual details:', error);
    }
  };

  const handleDelete = async (accrual: Accrual) => {
    if (!window.confirm(`Вы уверены, что хотите удалить начисление за период ${new Date(accrual.period_start).toLocaleDateString('ru-RU')} - ${new Date(accrual.period_end).toLocaleDateString('ru-RU')}?`)) {
      return;
    }

    try {
      await client.delete(`/accruals/${accrual.id}/`);
      fetchAccruals();
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

  const handleAcceptClick = (accrual: Accrual) => {
    setAcceptingAccrual(accrual);
    setIsAcceptModalOpen(true);
  };

  const handleAcceptPayment = async (data: { payment_date: string; amount: string; comment: string; account: number }) => {
    if (!acceptingAccrual) return;

    try {
      const response = await client.post(`/accruals/${acceptingAccrual.id}/accept/`, {
        payment_date: data.payment_date,
        amount: data.amount,
        comment: data.comment,
        account: data.account,
      });
      
      alert(`Платеж принят. Распределено на ${response.data.allocations_count} начислений.`);
      fetchAccruals();
      setIsAcceptModalOpen(false);
      setAcceptingAccrual(null);
    } catch (error: any) {
      let errorMessage = 'Ошибка при принятии платежа';
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
      throw error; // Пробрасываем ошибку, чтобы модальное окно не закрывалось
    }
  };

  const handleSelectAccrual = (accrualId: number, checked: boolean) => {
    setSelectedAccruals(prev => {
      const newSet = new Set(prev);
      if (checked) {
        newSet.add(accrualId);
      } else {
        newSet.delete(accrualId);
      }
      return newSet;
    });
  };

  const handleSelectAll = (checked: boolean) => {
    if (checked) {
      const allIds = new Set(accruals.map(a => a.id));
      setSelectedAccruals(allIds);
    } else {
      setSelectedAccruals(new Set());
    }
  };

  const handleBulkDelete = async () => {
    if (selectedAccruals.size === 0) {
      alert('Выберите начисления для удаления');
      return;
    }

    if (!window.confirm(`Вы уверены, что хотите удалить ${selectedAccruals.size} начислений? Это действие нельзя отменить.`)) {
      return;
    }

    try {
      const response = await client.post('/accruals/bulk_delete/', {
        ids: Array.from(selectedAccruals),
      });
      
      alert(response.data.status || `Удалено начислений: ${response.data.deleted_count}`);
      setSelectedAccruals(new Set());
      fetchAccruals();
    } catch (error: any) {
      let errorMessage = 'Ошибка при удалении начислений';
      if (error.response?.data) {
        if (error.response.data.error) {
          errorMessage = error.response.data.error;
        } else if (typeof error.response.data === 'string') {
          errorMessage = error.response.data;
        }
      }
      alert(errorMessage);
    }
  };

  const handleBulkAccept = () => {
    if (selectedAccruals.size === 0) {
      alert('Выберите начисления для принятия');
      return;
    }

    // Проверяем, что выбранные начисления не оплачены
    const selectedAccrualObjects = accruals.filter(a => selectedAccruals.has(a.id));
    const paidAccruals = selectedAccrualObjects.filter(a => a.status === 'paid');
    
    if (paidAccruals.length > 0) {
      alert(`Некоторые выбранные начисления уже оплачены. Пожалуйста, снимите выделение с оплаченных начислений.`);
      return;
    }

    setIsBulkAcceptModalOpen(true);
  };

  const handleBulkAcceptPayment = async (data: { payment_date: string; comment: string; account: number }) => {
    try {
      const response = await client.post('/accruals/bulk_accept/', {
        accrual_ids: Array.from(selectedAccruals),
        payment_date: data.payment_date,
        comment: data.comment,
        account: data.account,
      });
      
      alert(`Создано платежей: ${response.data.payments_created}. Распределено на ${response.data.total_allocations} начислений.`);
      setSelectedAccruals(new Set());
      setIsBulkAcceptModalOpen(false);
      fetchAccruals();
    } catch (error: any) {
      let errorMessage = 'Ошибка при массовом принятии платежей';
      if (error.response?.data) {
        if (error.response.data.error) {
          errorMessage = error.response.data.error;
        } else if (typeof error.response.data === 'string') {
          errorMessage = error.response.data;
        }
      }
      alert(errorMessage);
      throw error;
    }
  };

  const getStatusLabel = (status: string) => {
    const labels: Record<string, string> = {
      'planned': 'Ожидает',
      'due': 'К оплате',
      'overdue': 'Просрочено',
      'partial': 'Частично оплачено',
      'paid': 'Оплачено',
    };
    return labels[status] || status;
  };

  // Группировка начислений по недвижимости
  const propertyGroups = useMemo(() => {
    const groups = new Map<string, PropertyGroup>();
    
    accruals.forEach(accrual => {
      // Используем комбинацию property_id и property_address для уникальности
      const propertyId = accrual.property_id || 0;
      const key = `${propertyId}_${accrual.property_address || accrual.property_name}`;
      
      if (!groups.has(key)) {
        groups.set(key, {
          property_id: propertyId,
          property_name: accrual.property_name,
          property_address: accrual.property_address,
          tenant_name: accrual.tenant_name,
          accruals: [],
          total_final: 0,
          total_paid: 0,
          total_balance: 0,
          periods_count: 0,
          paid_count: 0,
          unpaid_count: 0,
          overdue_count: 0,
          currency: accrual.currency || 'сом',
          max_overdue_days: 0,
          status: '',
          utility_type_display: accrual.utility_type_display || 'Аренда',
        });
      }
      
      const group = groups.get(key)!;
      group.accruals.push(accrual);
      group.total_final += parseFloat(accrual.final_amount);
      group.total_paid += parseFloat(accrual.paid_amount);
      group.total_balance += parseFloat(accrual.balance);
      group.periods_count += 1;
      
      if (accrual.status === 'paid') {
        group.paid_count += 1;
      } else {
        group.unpaid_count += 1;
      }
      
      // Проверяем просрочку по дате и overdue_days, а не только по статусу
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const dueDate = new Date(accrual.due_date);
      dueDate.setHours(0, 0, 0, 0);
      const isOverdue = dueDate < today && parseFloat(accrual.balance) > 0;
      
      if (isOverdue || (accrual.overdue_days && accrual.overdue_days > 0)) {
        group.overdue_count += 1;
        const overdueDays = accrual.overdue_days || Math.floor((today.getTime() - dueDate.getTime()) / (1000 * 60 * 60 * 24));
        if (overdueDays > group.max_overdue_days) {
          group.max_overdue_days = overdueDays;
        }
      }
      
      // Определяем общий статус группы (приоритет: overdue > due > partial > paid > planned)
      // Проверяем просрочку по дате, а не только по статусу
      if (isOverdue && group.status !== 'overdue') {
        group.status = 'overdue';
      } else if (accrual.status === 'overdue' && group.status !== 'overdue') {
        group.status = 'overdue';
      } else if (accrual.status === 'due' && !['overdue'].includes(group.status)) {
        group.status = 'due';
      } else if (accrual.status === 'partial' && !['overdue', 'due'].includes(group.status)) {
        group.status = 'partial';
      } else if (accrual.status === 'paid' && !['overdue', 'due', 'partial'].includes(group.status)) {
        group.status = 'paid';
      } else if (accrual.status === 'planned' && !group.status && !isOverdue) {
        group.status = 'planned';
      }
    });
    
    return Array.from(groups.values());
  }, [accruals]);

  const toggleProperty = (propertyKey: string) => {
    setExpandedProperties(prev => {
      const newSet = new Set(prev);
      if (newSet.has(propertyKey)) {
        newSet.delete(propertyKey);
      } else {
        newSet.add(propertyKey);
      }
      return newSet;
    });
  };

  if (loading) {
    return <div className="text-center py-12">Загрузка...</div>;
  }

  return (
    <div>
      <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-3 mb-4 md:mb-6">
        <h1 className="text-xl md:text-2xl font-bold text-gray-900">Начисления</h1>
        <button
          onClick={handleAdd}
          className="flex items-center px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700"
        >
          <PlusIcon className="h-5 w-5 mr-2" />
          Добавить начисление
        </button>
      </div>

      {/* KPI Metrics Cards - уменьшена высота карточек еще больше */}
      <div className="grid grid-cols-2 md:grid-cols-2 lg:grid-cols-4 gap-2 md:gap-3 mb-4 md:mb-6">
        <div 
          onClick={() => window.location.href = '/properties'}
          className="bg-white p-2 rounded-card shadow-medium border border-slate-200 cursor-pointer hover:border-indigo-300 hover:shadow-large transition-all"
        >
          <div className="text-xs font-medium text-slate-500 uppercase tracking-wide mb-0.5">Недвижимостей</div>
          <div className="text-base md:text-lg font-semibold text-slate-900">{summaryKPI.propertiesCount}</div>
        </div>
        <div 
          className="bg-white p-2 rounded-card shadow-medium border border-slate-200 cursor-pointer hover:border-indigo-300 hover:shadow-large transition-all"
        >
          <div className="text-xs font-medium text-slate-500 uppercase tracking-wide mb-0.5">Итого начислений</div>
          <div className="text-base md:text-lg font-semibold text-slate-900">
            {formatAmount(summaryKPI.totalFinal.toString())} с
          </div>
        </div>
        <div 
          onClick={() => window.location.href = '/payments'}
          className="bg-white p-2 rounded-card shadow-medium border border-slate-200 cursor-pointer hover:border-emerald-300 hover:shadow-large transition-all"
        >
          <div className="text-xs font-medium text-slate-500 uppercase tracking-wide mb-0.5">Итого оплачено</div>
          <div className="text-base md:text-lg font-semibold text-emerald-600">
            {formatAmount(summaryKPI.totalPaid.toString())} с
          </div>
        </div>
        <div 
          className="bg-white p-2 rounded-card shadow-medium border border-slate-200 cursor-pointer hover:border-blue-300 hover:shadow-large transition-all"
        >
          <div className="text-xs font-medium text-slate-500 uppercase tracking-wide mb-0.5">Остаток к оплате</div>
          <div className="text-base md:text-lg font-semibold text-blue-600">
            {formatAmount(summaryKPI.totalBalance.toString())} с
          </div>
        </div>
      </div>

      {/* Поиск - сверху отдельно */}
      <div className="bg-white p-2 rounded-lg shadow-sm border border-gray-200 mb-3">
        <div className="relative">
          <Search className="absolute left-2 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
          <input
            type="text"
            placeholder="Договор, недвижимость, арендатор..."
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
            Все начисления
          </button>
          <button
            onClick={() => setFilters({ ...filters, status: 'overdue' })}
            className={`px-3 py-1 text-xs font-medium rounded transition-colors ${
              filters.status === 'overdue'
                ? 'bg-indigo-600 text-white'
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
          >
            Просрочено
          </button>
          <button
            onClick={() => setFilters({ ...filters, status: 'due' })}
            className={`px-3 py-1 text-xs font-medium rounded transition-colors ${
              filters.status === 'due'
                ? 'bg-indigo-600 text-white'
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
          >
            К оплате
          </button>
          <button
            onClick={() => setFilters({ ...filters, status: 'paid' })}
            className={`px-3 py-1 text-xs font-medium rounded transition-colors ${
              filters.status === 'paid'
                ? 'bg-indigo-600 text-white'
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
          >
            Оплачено
          </button>
          <div className="ml-auto flex items-center gap-2">
            <select
              value={filters.utility_type}
              onChange={(e) => setFilters({ ...filters, utility_type: e.target.value })}
              className="px-2 py-1 text-xs border border-gray-300 rounded focus:ring-primary-500 focus:border-primary-500"
            >
              <option value="">Все типы</option>
              <option value="rent">Аренда</option>
              <option value="electricity">Электричество</option>
              <option value="water">Вода</option>
              <option value="gas">Газ</option>
              <option value="garbage">Мусор</option>
              <option value="service">Сервисное обслуживание</option>
            </select>
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
              urlParamPrefix="due_date"
            />
          </div>
        </div>
      </div>

      {/* Панель массовых операций */}
      {selectedAccruals.size > 0 && (
        <div className="mb-4 p-3 bg-primary-50 border border-primary-200 rounded-lg flex items-center justify-between">
          <div className="text-sm text-gray-700">
            Выбрано начислений: <span className="font-semibold">{selectedAccruals.size}</span>
          </div>
          <div className="flex gap-2">
            <button
              onClick={handleBulkAccept}
              className="px-3 py-1.5 text-xs bg-green-600 text-white rounded hover:bg-green-700"
            >
              Принять выбранные
            </button>
            <button
              onClick={async () => {
                if (selectedAccruals.size === 0) {
                  alert('Выберите начисления для редактирования');
                  return;
                }
                
                // Загружаем данные первого выбранного начисления для предзаполнения формы
                const selectedAccrualObjects = accruals.filter(a => selectedAccruals.has(a.id));
                if (selectedAccrualObjects.length > 0) {
                  try {
                    const response = await client.get(`/accruals/${selectedAccrualObjects[0].id}/`);
                    const fullAccrual = response.data;
                    setEditingAccrual({
                      id: undefined, // undefined означает массовое редактирование
                      contract: fullAccrual.contract,
                      period_start: fullAccrual.period_start,
                      period_end: fullAccrual.period_end,
                      due_date: fullAccrual.due_date,
                      base_amount: fullAccrual.base_amount,
                      adjustments: fullAccrual.adjustments || '0',
                      utilities_amount: fullAccrual.utilities_amount || '0',
                      utility_type: fullAccrual.utility_type || 'rent',
                      comment: fullAccrual.comment || '',
                    });
                    setIsBulkEdit(true);
                    setIsDrawerOpen(true);
                  } catch (error) {
                    console.error('Error fetching accrual details:', error);
                    alert('Ошибка при загрузке данных начисления');
                  }
                }
              }}
              className="px-3 py-1.5 text-xs bg-blue-600 text-white rounded hover:bg-blue-700"
            >
              Редактировать выбранные
            </button>
            <button
              onClick={handleBulkDelete}
              className="px-3 py-1.5 text-xs bg-red-600 text-white rounded hover:bg-red-700"
            >
              Удалить выбранные
            </button>
            <button
              onClick={() => setSelectedAccruals(new Set())}
              className="px-3 py-1.5 text-xs bg-gray-300 text-gray-700 rounded hover:bg-gray-400"
            >
              Снять выделение
            </button>
          </div>
        </div>
      )}

      <div className="bg-white shadow rounded-lg overflow-hidden">
        <div className="overflow-x-auto -mx-4 md:mx-0">
          <div className="inline-block min-w-full align-middle">
            <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-2 py-1 text-left text-xs font-medium text-gray-500 tracking-wider w-8 leading-none">
                <input
                  type="checkbox"
                  checked={selectedAccruals.size > 0 && selectedAccruals.size === accruals.length}
                  onChange={(e) => handleSelectAll(e.target.checked)}
                  className="rounded border-gray-300 text-primary-600 focus:ring-primary-500"
                />
              </th>
              <th className="px-2 py-1 text-left text-xs font-medium text-gray-500 tracking-wider w-8 leading-none"></th>
              <th className="px-2 py-1 text-left text-xs font-medium text-gray-500 tracking-wider leading-none">
                Адрес недвижимости
              </th>
              <th className="px-2 py-1 text-left text-xs font-medium text-gray-500 tracking-wider leading-none">
                Арендатор
              </th>
              <th className="px-2 py-1 text-left text-xs font-medium text-gray-500 tracking-wider leading-none">
                Тип начисления
              </th>
              <th className="px-2 py-1 text-left text-xs font-medium text-gray-500 tracking-wider leading-none">
                Срок оплаты
              </th>
              <th className="px-2 py-1 text-left text-xs font-medium text-gray-500 tracking-wider leading-none">
                Просрочка
              </th>
              <th className="px-2 py-1 text-left text-xs font-medium text-gray-500 tracking-wider leading-none">
                Итог
              </th>
              <th className="px-2 py-1 text-left text-xs font-medium text-gray-500 tracking-wider leading-none">
                Оплачено
              </th>
              <th className="px-2 py-1 text-left text-xs font-medium text-gray-500 tracking-wider leading-none">
                Остаток
              </th>
              <th className="px-2 py-1 text-left text-xs font-medium text-gray-500 tracking-wider leading-none">
                Статус
              </th>
              <th className="px-2 py-1 text-left text-xs font-medium text-gray-500 tracking-wider leading-none">
                Действия
              </th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-100">
            {propertyGroups.map((group, groupIndex) => {
              const propertyKey = `${group.property_id}_${group.property_address || group.property_name}`;
              const isExpanded = expandedProperties.has(propertyKey);
              return (
                <React.Fragment key={propertyKey}>
                  {/* Строка группы */}
                  <tr 
                    className={`cursor-pointer hover:bg-gray-50 ${groupIndex % 2 === 0 ? 'bg-white' : 'bg-primary-50'}`}
                    onClick={() => toggleProperty(propertyKey)}
                  >
                    <td className="px-2 py-0.5 whitespace-nowrap" onClick={(e) => e.stopPropagation()}>
                      <input
                        type="checkbox"
                        checked={group.accruals.length > 0 && group.accruals.every(a => selectedAccruals.has(a.id))}
                        onChange={(e) => {
                          group.accruals.forEach(accrual => {
                            handleSelectAccrual(accrual.id, e.target.checked);
                          });
                        }}
                        className="rounded border-gray-300 text-primary-600 focus:ring-primary-500"
                      />
                    </td>
                    <td className="px-2 py-0.5 whitespace-nowrap">
                      {isExpanded ? (
                        <ChevronDownIcon className="h-4 w-4 text-gray-500" />
                      ) : (
                        <ChevronRightIcon className="h-4 w-4 text-gray-500" />
                      )}
                    </td>
                    <td className="px-2 py-0.5 whitespace-nowrap text-xs font-medium text-gray-900 leading-tight">
                      {group.property_address || group.property_name}
                    </td>
                    <td className="px-2 py-0.5 whitespace-nowrap text-xs text-gray-500 leading-tight">
                      {group.tenant_name}
                    </td>
                    <td className="px-2 py-0.5 whitespace-nowrap text-xs text-gray-500 leading-tight">
                      <span className="px-1.5 py-0.5 text-xs rounded-full bg-blue-100 text-blue-800 leading-none">
                        {group.utility_type_display}
                      </span>
                    </td>
                    <td className="px-2 py-0.5 whitespace-nowrap text-xs text-gray-500 leading-tight">
                      {group.accruals.length > 0 && (
                        <span className="text-xs text-gray-400">
                          {new Date(Math.min(...group.accruals.map(a => new Date(a.due_date).getTime()))).toLocaleDateString('ru-RU')}
                        </span>
                      )}
                    </td>
                    <td className="px-2 py-0.5 whitespace-nowrap text-xs text-gray-500 leading-tight">
                      {group.max_overdue_days > 0 ? (
                        <span className="text-red-600 font-medium">
                          {group.max_overdue_days} дн.
                        </span>
                      ) : (
                        <span className="text-gray-400">-</span>
                      )}
                    </td>
                    <td className="px-2 py-0.5 whitespace-nowrap text-xs font-medium text-gray-900 leading-tight">
                      {formatAmount(group.total_final.toString())} {group.currency}
                    </td>
                    <td className="px-2 py-0.5 whitespace-nowrap text-xs text-gray-500 leading-tight">
                      {formatAmount(group.total_paid.toString())} {group.currency}
                    </td>
                    <td className="px-2 py-0.5 whitespace-nowrap text-xs font-medium text-gray-900 leading-tight">
                      {formatAmount(group.total_balance.toString())} {group.currency}
                    </td>
                    <td className="px-2 py-0.5 whitespace-nowrap leading-tight">
                      <span className={`px-1.5 py-0.5 text-xs rounded-full leading-none ${
                        group.status === 'paid' ? 'bg-green-100 text-green-800' :
                        group.status === 'overdue' ? 'bg-red-100 text-red-800' :
                        group.status === 'partial' ? 'bg-yellow-100 text-yellow-800' :
                        group.status === 'due' ? 'bg-orange-100 text-orange-800' :
                        'bg-gray-100 text-gray-800'
                      }`}>
                        {getStatusLabel(group.status)}
                      </span>
                    </td>
                    <td className="px-2 py-0.5 whitespace-nowrap text-right leading-tight">
                      <div className="flex justify-end group">
                        <ActionsMenu
                          items={[
                            { label: 'Редактировать', onClick: () => {/* TODO: массовое редактирование группы */} },
                          ]}
                        />
                      </div>
                    </td>
                  </tr>
                  
                  {/* Раскрытый список начислений */}
                  {isExpanded && (
                    <tr>
                      <td colSpan={10} className="p-0">
                        <div className="bg-slate-50 border-l-4 border-indigo-200">
                          <div className="px-4 py-2">
                            <div className="text-xs font-medium text-slate-700 mb-3">
                              Начислений: {group.periods_count} | 
                              Погашено: {group.paid_count} | 
                              Не погашено: {group.unpaid_count} | 
                              Просрочено: {group.overdue_count}
                            </div>
                            <div className="space-y-1">
                              {group.accruals.map((accrual, idx) => {
                                // Проверяем просрочку по дате, а не только по статусу
                                const today = new Date();
                                today.setHours(0, 0, 0, 0);
                                const dueDate = new Date(accrual.due_date);
                                dueDate.setHours(0, 0, 0, 0);
                                const isOverdue = (dueDate < today && parseFloat(accrual.balance) > 0) || 
                                                  accrual.status === 'overdue' || 
                                                  (accrual.overdue_days && accrual.overdue_days > 0);
                                const isPaid = accrual.status === 'paid';
                                const isSelected = selectedAccruals.has(accrual.id);
                                return (
                                  <div 
                                    key={accrual.id} 
                                    className={`flex items-center gap-4 text-xs py-2 px-4 rounded-card hover:bg-white transition-colors border-b border-slate-100 last:border-0 ${
                                      isSelected ? 'bg-indigo-50' : ''
                                    }`}
                                  >
                                  <div className="w-6 flex-shrink-0" onClick={(e) => e.stopPropagation()}>
                                    <input
                                      type="checkbox"
                                      checked={isSelected}
                                      onChange={(e) => handleSelectAccrual(accrual.id, e.target.checked)}
                                      className="rounded border-gray-300 text-primary-600 focus:ring-primary-500"
                                    />
                                  </div>
                                  <div className="w-32 text-slate-700">
                                    {new Date(accrual.period_start).toLocaleDateString('ru-RU')} - {new Date(accrual.period_end).toLocaleDateString('ru-RU')}
                                  </div>
                                  <div className="w-24 text-slate-700">
                                    {new Date(accrual.due_date).toLocaleDateString('ru-RU')}
                                  </div>
                                  <div className="w-20">
                                    {(() => {
                                      const overdueDays = accrual.overdue_days || (isOverdue ? Math.floor((today.getTime() - dueDate.getTime()) / (1000 * 60 * 60 * 24)) : 0);
                                      return overdueDays > 0 ? (
                                        <span className="px-2 py-0.5 rounded-full bg-red-50 text-red-700 font-medium text-xs">
                                          {overdueDays} дн.
                                        </span>
                                      ) : (
                                        <span className="text-slate-400">-</span>
                                      );
                                    })()}
                                  </div>
                                  <div className="w-24 font-medium text-slate-900">
                                    {formatAmount(accrual.final_amount)} {accrual.currency || 'с'}
                                  </div>
                                  <div className="w-24 text-slate-600">
                                    {formatAmount(accrual.paid_amount)} {accrual.currency || 'с'}
                                  </div>
                                  <div className={`w-24 font-medium ${isOverdue ? 'text-red-600' : 'text-slate-900'}`}>
                                    {formatAmount(accrual.balance)} {accrual.currency || 'с'}
                                  </div>
                                  <div className="w-32">
                                    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border ${
                                      accrual.status === 'paid' ? 'bg-emerald-50 text-emerald-700 border-emerald-200' :
                                      accrual.status === 'overdue' ? 'bg-red-50 text-red-700 border-red-200' :
                                      accrual.status === 'partial' ? 'bg-amber-50 text-amber-700 border-amber-200' :
                                      accrual.status === 'due' ? 'bg-orange-50 text-orange-700 border-orange-200' :
                                      'bg-slate-100 text-slate-600 border-slate-200'
                                    }`}>
                                      {getStatusLabel(accrual.status)}
                                    </span>
                                  </div>
                                  <div className="flex-1 flex justify-end gap-2">
                                    {!isPaid && (
                                      <button
                                        onClick={(e) => {
                                          e.stopPropagation();
                                          handleAcceptClick(accrual);
                                        }}
                                        className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-emerald-700 bg-emerald-50 border border-emerald-200 rounded-card hover:bg-emerald-100 transition-colors"
                                      >
                                        <CheckCircleIcon className="h-4 w-4" />
                                        Принять
                                      </button>
                                    )}
                                    {isPaid && parseFloat(accrual.paid_amount) > 0 && (
                                      <button
                                        onClick={async (e) => {
                                          e.stopPropagation();
                                          if (!window.confirm(`Отменить оплату начисления за период ${new Date(accrual.period_start).toLocaleDateString('ru-RU')} - ${new Date(accrual.period_end).toLocaleDateString('ru-RU')}? Сумма ${formatAmount(accrual.paid_amount)} ${accrual.currency || 'сом'} будет возвращена в начисление.`)) {
                                            return;
                                          }
                                          try {
                                            const response = await client.post(`/accruals/${accrual.id}/cancel_payment/`);
                                            alert(response.data.status || 'Оплата отменена');
                                            fetchAccruals();
                                          } catch (error: any) {
                                            let errorMessage = 'Ошибка при отмене оплаты';
                                            if (error.response?.data) {
                                              if (error.response.data.error) {
                                                errorMessage = error.response.data.error;
                                              } else if (typeof error.response.data === 'string') {
                                                errorMessage = error.response.data;
                                              }
                                            }
                                            alert(errorMessage);
                                          }
                                        }}
                                        className="px-2 py-1 text-xs bg-orange-600 text-white rounded hover:bg-orange-700"
                                      >
                                        Отменить оплату
                                      </button>
                                    )}
                                    <button
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        handleEdit(accrual);
                                      }}
                                      className="text-primary-600 hover:text-primary-900 text-xs"
                                    >
                                      Редактировать
                                    </button>
                                    <button
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        handleDelete(accrual);
                                      }}
                                      className="text-red-600 hover:text-red-900 text-xs"
                                    >
                                      Удалить
                                    </button>
                                  </div>
                                </div>
                              );
                            })}
                          </div>
                        </div>
                        </div>
                      </td>
                    </tr>
                  )}
                </React.Fragment>
              );
            })}
          </tbody>
        </table>
          </div>
        </div>
      </div>

      <Drawer
        isOpen={isDrawerOpen}
        onClose={() => {
          setIsDrawerOpen(false);
          setEditingAccrual(null);
          setIsBulkEdit(false);
        }}
        title={editingAccrual ? 'Редактировать начисление' : 'Добавить начисление'}
        footer={
          <div className="flex gap-3 justify-end">
            <button
              type="button"
              onClick={() => {
                setIsDrawerOpen(false);
                setEditingAccrual(null);
                setIsBulkEdit(false);
              }}
              className="px-4 py-2 text-sm font-medium text-slate-700 bg-white border border-slate-300 rounded-card hover:bg-slate-50 transition-colors"
            >
              Отмена
            </button>
            <button
              type="submit"
              form="accrual-form"
              disabled={formLoading}
              className="px-4 py-2 text-sm font-medium text-white bg-indigo-600 rounded-card hover:bg-indigo-700 transition-colors disabled:opacity-50"
            >
              {formLoading ? 'Сохранение...' : 'Сохранить'}
            </button>
          </div>
        }
      >
        <AccrualForm
          accrual={editingAccrual}
          onSubmit={handleSubmit}
          loading={formLoading}
          isBulkEdit={isBulkEdit}
          selectedCount={selectedAccruals.size}
        />
      </Drawer>

      <AcceptPaymentModal
        isOpen={isAcceptModalOpen}
        onClose={() => {
          setIsAcceptModalOpen(false);
          setAcceptingAccrual(null);
        }}
        accrual={acceptingAccrual}
        onAccept={handleAcceptPayment}
      />

      <BulkAcceptPaymentModal
        isOpen={isBulkAcceptModalOpen}
        onClose={() => {
          setIsBulkAcceptModalOpen(false);
        }}
        selectedCount={selectedAccruals.size}
        onAccept={handleBulkAcceptPayment}
      />
    </div>
  );
}
