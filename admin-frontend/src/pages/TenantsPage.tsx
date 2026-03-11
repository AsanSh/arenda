import React, { useState, useEffect, useCallback } from 'react';
import { Plus, Users, Briefcase, Search, ChevronUp, ChevronDown } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import client from '../api/client';
import Drawer from '../components/Drawer';
import TenantForm from '../components/TenantForm';
import ActionsMenu from '../components/ui/ActionsMenu';
import PeriodFilterBar from '../components/PeriodFilterBar';
import { useDensity } from '../contexts/DensityContext';
import { useUser } from '../contexts/UserContext';
import { useCompactStyles } from '../hooks/useCompactStyles';
import { DatePreset } from '../utils/datePresets';

interface AdditionalContact {
  name: string;
  phone: string;
}

interface Tenant {
  id?: number;
  name: string;
  type: string;
  type_display?: string;
  contact_person: string;
  email: string;
  phone: string;
  inn: string;
  address: string;
  comment: string;
  additional_contacts?: AdditionalContact[];
}

type SortField = 'name' | 'type' | 'email' | 'phone' | 'inn';
type SortDirection = 'asc' | 'desc';

export default function TenantsPage() {
  const navigate = useNavigate();
  const { isCompact } = useDensity();
  const { user, canWrite } = useUser();
  const compact = useCompactStyles();
  const canEdit = canWrite('tenants') || !!user?.is_admin || user?.role === 'admin';
  const [tenants, setTenants] = useState<Tenant[]>([]);
  const [loading, setLoading] = useState(true);
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const [editingTenant, setEditingTenant] = useState<Tenant | null>(null);
  const [filters, setFilters] = useState({
    type: '',
    search: '',
  });
  const [sortField, setSortField] = useState<SortField | null>(null);
  const [sortDirection, setSortDirection] = useState<SortDirection>('asc');
  const [dateFilter, setDateFilter] = useState<{ preset: DatePreset | null; from: string | null; to: string | null }>({
    preset: null,
    from: null,
    to: null,
  });

  useEffect(() => {
    fetchTenants();
  }, [filters, dateFilter, sortField, sortDirection]);

  const fetchTenants = async () => {
    try {
      let url = '/tenants/';
      const params = new URLSearchParams();
      params.append('page_size', '5000'); // Показать всех контрагентов (API по умолчанию 20)
      
      if (filters.type) params.append('type', filters.type);
      if (filters.search) params.append('search', filters.search);
      
      if (dateFilter.from) params.append('created_at__gte', dateFilter.from);
      if (dateFilter.to) params.append('created_at__lte', dateFilter.to);
      
      // Сортировка
      if (sortField) {
        const ordering = sortDirection === 'desc' ? `-${sortField}` : sortField;
        params.append('ordering', ordering);
      }
      
      if (params.toString()) {
        url += `?${params.toString()}`;
      }
      
      const response = await client.get(url);
      setTenants(response.data.results || response.data);
      setLoading(false);
    } catch (error) {
      console.error('Error fetching tenants:', error);
      setTenants([]);
      setLoading(false);
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

  const [formLoading, setFormLoading] = useState(false);

  const handleSubmit = useCallback(async (data: Tenant) => {
    setFormLoading(true);
    try {
      if (editingTenant?.id) {
        await client.patch(`/tenants/${editingTenant.id}/`, data);
      } else {
        await client.post('/tenants/', data);
      }
      setIsDrawerOpen(false);
      setEditingTenant(null);
      fetchTenants();
    } catch (error: any) {
      console.error('Error saving tenant:', error);
      const data = error?.response?.data;
      let errorMessage = data?.detail || data?.error || 'Ошибка при сохранении';
      if (typeof data === 'object' && !data.detail && !data.error) {
        const fieldErrors = Object.entries(data)
          .filter(([, v]) => Array.isArray(v) ? v.length : v)
          .map(([k, v]) => `${k}: ${Array.isArray(v) ? v.join(', ') : v}`)
          .join('\n');
        if (fieldErrors) errorMessage = fieldErrors;
      }
      alert(errorMessage);
    } finally {
      setFormLoading(false);
    }
  }, [editingTenant]);

  const handleEdit = (tenant: Tenant) => {
    setEditingTenant(tenant);
    setIsDrawerOpen(true);
  };

  const handleAdd = () => {
    setEditingTenant(null);
    setIsDrawerOpen(true);
  };

  const handleDelete = async (tenant: Tenant) => {
    if (!window.confirm(`Вы уверены, что хотите удалить контрагента "${tenant.name}"?`)) {
      return;
    }

    try {
      await client.delete(`/tenants/${tenant.id}/`);
      fetchTenants();
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

  const getTypeIcon = useCallback((type: string) => {
    if (type === 'tenant') return <Users className="h-4 w-4" />;
    if (type === 'landlord') return <Briefcase className="h-4 w-4" />;
    return <Users className="h-4 w-4" />;
  }, []);

  if (loading) {
    return <div className="text-center py-12">Загрузка...</div>;
  }

  return (
    <div className="space-y-2">
      {/* Header - Компактный */}
      <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-2">
        <div>
          <h1 className={compact.sectionHeader + ' text-slate-900'}>Контрагенты</h1>
          <p className={`mt-0.5 ${compact.smallText} text-slate-500`}>Управление контрагентами и контактами</p>
        </div>
        <button
          onClick={handleAdd}
          className={`flex items-center gap-1.5 ${compact.buttonPadding} bg-indigo-600 text-white rounded-lg shadow-sm hover:bg-indigo-700 transition-colors ${compact.buttonText} font-medium`}
        >
          <Plus className={compact.iconSize} />
          Добавить
        </button>
      </div>

      {/* KPI — 4 карточки в одну строку */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
        <div className="bg-white rounded-lg border border-gray-200 px-3 py-2 shadow-sm">
          <p className="text-[10px] text-gray-500 uppercase tracking-wide">Всего</p>
          <p className="text-lg font-semibold text-slate-800">{tenants.length}</p>
        </div>
        <div className="bg-white rounded-lg border border-gray-200 px-3 py-2 shadow-sm">
          <p className="text-[10px] text-gray-500 uppercase tracking-wide">Арендаторы</p>
          <p className="text-lg font-semibold text-slate-800">{tenants.filter(t => t.type === 'tenant').length}</p>
        </div>
        <div className="bg-white rounded-lg border border-gray-200 px-3 py-2 shadow-sm">
          <p className="text-[10px] text-gray-500 uppercase tracking-wide">Арендодатели</p>
          <p className="text-lg font-semibold text-slate-800">{tenants.filter(t => t.type === 'landlord').length}</p>
        </div>
        <div className="bg-white rounded-lg border border-gray-200 px-3 py-2 shadow-sm">
          <p className="text-[10px] text-gray-500 uppercase tracking-wide">Прочие</p>
          <p className="text-lg font-semibold text-slate-800">{tenants.filter(t => t.type !== 'tenant' && t.type !== 'landlord').length}</p>
        </div>
      </div>

      {/* Поиск - Компактный */}
      <div className={`bg-white ${compact.cardPaddingSmall} rounded-lg shadow-sm border border-gray-200`}>
        <div className="relative">
          <Search className={`absolute left-2 top-1/2 transform -translate-y-1/2 ${compact.iconSizeSmall} text-gray-400`} />
          <input
            type="text"
            placeholder="Название, email, телефон..."
            value={filters.search}
            onChange={(e) => setFilters({ ...filters, search: e.target.value })}
            className={`w-full pl-7 pr-2 ${compact.buttonPadding} ${compact.textSize} border border-gray-300 rounded-lg focus:ring-1 focus:ring-indigo-500 focus:border-indigo-500`}
          />
        </div>
      </div>

      {/* Фильтры - Компактные */}
      <div className={`bg-white ${compact.cardPaddingSmall} rounded-lg shadow-sm border border-gray-200`}>
        <div className="flex flex-wrap items-center gap-1.5">
          <span className={`${compact.smallText} font-medium text-gray-700`}>Показать:</span>
          <button
            onClick={() => setFilters({ ...filters, type: '' })}
            className={`px-2 py-1 ${compact.smallText} font-medium rounded-lg transition-colors ${
              !filters.type
                ? 'bg-indigo-600 text-white'
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
          >
            Все контрагенты
          </button>
          <button
            onClick={() => setFilters({ ...filters, type: 'tenant' })}
            className={`px-2 py-1 ${compact.smallText} font-medium rounded-lg transition-colors ${
              filters.type === 'tenant'
                ? 'bg-indigo-600 text-white'
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
          >
            Арендаторы
          </button>
          <button
            onClick={() => setFilters({ ...filters, type: 'landlord' })}
            className={`px-2 py-1 ${compact.smallText} font-medium rounded-lg transition-colors ${
              filters.type === 'landlord'
                ? 'bg-indigo-600 text-white'
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
          >
            Арендодатели
          </button>
          <div className="ml-auto flex items-center gap-1.5">
            <select
              value={filters.type}
              onChange={(e) => setFilters({ ...filters, type: e.target.value })}
              className={`px-1.5 py-1 ${compact.smallText} border border-gray-300 rounded-lg focus:ring-1 focus:ring-indigo-500 focus:border-indigo-500`}
            >
              <option value="">Все типы</option>
              <option value="tenant">Арендатор</option>
              <option value="landlord">Арендодатель</option>
              <option value="company_owner">Владелец компании</option>
              <option value="property_owner">Хозяин недвижимости</option>
              <option value="investor">Инвестор</option>
            </select>
            <PeriodFilterBar
              value={dateFilter}
              onChange={setDateFilter}
              urlParamPrefix="created_at"
            />
          </div>
        </div>
      </div>

      {/* Таблица — точный стиль договоров: primary-50 зебра, px-2 py-0.5, text-xs */}
      <div className="bg-white shadow rounded-lg overflow-hidden max-w-full">
        <div className="overflow-x-auto no-scrollbar w-full">
          <div className="inline-block min-w-full align-middle">
            <table className="min-w-full divide-y divide-gray-100">
            <thead className="bg-gray-50">
              <tr>
                <th className={`${isCompact ? 'px-1 py-0.5' : 'px-2 py-1'} text-left text-xs font-medium text-gray-500 tracking-wider leading-none w-12`}>№</th>
                <th className={`${isCompact ? 'px-1 py-0.5' : 'px-2 py-1'} text-left text-xs font-medium text-gray-500 tracking-wider leading-none cursor-pointer hover:bg-gray-100 transition-colors`} onClick={() => handleSort('name')}>
                  Название {getSortIcon('name')}
                </th>
                <th className={`${isCompact ? 'px-1 py-0.5' : 'px-2 py-1'} text-left text-xs font-medium text-gray-500 tracking-wider leading-none cursor-pointer hover:bg-gray-100 transition-colors`} onClick={() => handleSort('type')}>
                  Тип {getSortIcon('type')}
                </th>
                <th className={`${isCompact ? 'px-1 py-0.5' : 'px-2 py-1'} text-left text-xs font-medium text-gray-500 tracking-wider leading-none hidden md:table-cell`}>Контактное лицо</th>
                <th className={`${isCompact ? 'px-1 py-0.5' : 'px-2 py-1'} text-left text-xs font-medium text-gray-500 tracking-wider leading-none cursor-pointer hover:bg-gray-100 transition-colors hidden lg:table-cell`} onClick={() => handleSort('email')}>
                  Email {getSortIcon('email')}
                </th>
                <th className={`${isCompact ? 'px-1 py-0.5' : 'px-2 py-1'} text-left text-xs font-medium text-gray-500 tracking-wider leading-none cursor-pointer hover:bg-gray-100 transition-colors`} onClick={() => handleSort('phone')}>
                  Телефон {getSortIcon('phone')}
                </th>
                <th className={`${isCompact ? 'px-1 py-0.5' : 'px-2 py-1'} text-left text-xs font-medium text-gray-500 tracking-wider leading-none hidden lg:table-cell`}>Доп. номер</th>
                <th className={`${isCompact ? 'px-1 py-0.5' : 'px-2 py-1'} text-left text-xs font-medium text-gray-500 tracking-wider leading-none cursor-pointer hover:bg-gray-100 transition-colors hidden xl:table-cell`} onClick={() => handleSort('inn')}>
                  ИНН {getSortIcon('inn')}
                </th>
                <th className={`${isCompact ? 'px-1 py-0.5' : 'px-2 py-1'} text-right text-xs font-medium text-gray-500 tracking-wider leading-none`}>Действия</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-100">
              {tenants.map((tenant, index) => (
                <tr key={tenant.id} className={`${index % 2 === 0 ? 'bg-white' : 'bg-primary-50'} leading-none`}>
                  <td className={`${isCompact ? 'px-1 py-0' : 'px-2 py-0.5'} whitespace-nowrap text-xs font-medium text-gray-900 leading-tight`}>{index + 1}</td>
                  <td className={`${isCompact ? 'px-1 py-0' : 'px-2 py-0.5'} whitespace-nowrap text-xs font-medium text-gray-900 leading-tight`}>
                    <button onClick={() => navigate(`/tenants/${tenant.id}`)} className="text-left hover:text-indigo-600 transition-colors">
                      {tenant.name}
                    </button>
                  </td>
                  <td className={`${isCompact ? 'px-1 py-0' : 'px-2 py-0.5'} whitespace-nowrap text-xs text-gray-500 leading-tight`}>
                    <div className="flex items-center gap-1.5 min-w-0">
                      <span className="shrink-0 text-slate-400">{getTypeIcon(tenant.type)}</span>
                      <span className="truncate">{tenant.type_display || tenant.type}</span>
                    </div>
                  </td>
                  <td className={`${isCompact ? 'px-1 py-0' : 'px-2 py-0.5'} whitespace-nowrap text-xs text-gray-500 leading-tight hidden md:table-cell`}>
                    {tenant.contact_person || <span className="text-slate-400 italic">—</span>}
                  </td>
                  <td className={`${isCompact ? 'px-1 py-0' : 'px-2 py-0.5'} whitespace-nowrap text-xs text-gray-500 leading-tight hidden lg:table-cell`}>
                    {tenant.email || <span className="text-slate-400 italic">—</span>}
                  </td>
                  <td className={`${isCompact ? 'px-1 py-0' : 'px-2 py-0.5'} whitespace-nowrap text-xs text-gray-500 leading-tight`}>
                    {tenant.phone || <span className="text-slate-400 italic">—</span>}
                  </td>
                  <td className={`${isCompact ? 'px-1 py-0' : 'px-2 py-0.5'} whitespace-nowrap text-xs text-gray-500 leading-tight hidden lg:table-cell`}>
                    {tenant.additional_contacts?.find(ac => ac.phone?.trim())?.phone ?? <span className="text-slate-400 italic">—</span>}
                  </td>
                  <td className={`${isCompact ? 'px-1 py-0' : 'px-2 py-0.5'} whitespace-nowrap text-xs text-gray-500 leading-tight hidden xl:table-cell`}>
                    {tenant.inn || <span className="text-slate-400 italic">—</span>}
                  </td>
                  <td className={`${isCompact ? 'px-1 py-0' : 'px-2 py-0.5'} whitespace-nowrap text-right leading-tight`}>
                    <div className="flex justify-end items-center gap-2">
                      {canEdit ? (
                        <>
                          <button
                            onClick={() => handleEdit(tenant)}
                            className="px-2 py-1 text-xs font-medium text-indigo-600 bg-indigo-50 rounded hover:bg-indigo-100 transition-colors"
                            title="Редактировать"
                          >
                            Редактировать
                          </button>
                          <ActionsMenu items={[{ label: 'Удалить', onClick: () => handleDelete(tenant), variant: 'danger' }]} alwaysVisible={true} />
                        </>
                      ) : (
                        <button
                          onClick={() => { window.location.href = `/requests?type=CHANGE_CONTACTS&related_contract=${tenant.id}`; }}
                          className="px-2 py-1 text-xs font-medium text-indigo-600 bg-indigo-50 rounded hover:bg-indigo-100 transition-colors"
                          title="Запросить изменение"
                        >
                          Запросить изменение
                        </button>
                      )}
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
          setEditingTenant(null);
        }}
        title={editingTenant ? 'Редактировать контрагента' : 'Добавить контрагента'}
        footer={
          <div className="flex gap-3 justify-end">
            <button
              type="button"
              onClick={() => {
                setIsDrawerOpen(false);
                setEditingTenant(null);
              }}
              className="px-4 py-2 text-sm font-medium text-slate-700 bg-white border border-slate-300 rounded-card hover:bg-slate-50 transition-colors"
            >
              Отмена
            </button>
            <button
              type="submit"
              form="tenant-form"
              disabled={formLoading}
              className="px-4 py-2 text-sm font-medium text-white bg-indigo-600 rounded-card hover:bg-indigo-700 transition-colors disabled:opacity-50"
            >
              {formLoading ? 'Сохранение...' : 'Сохранить'}
            </button>
          </div>
        }
      >
        <TenantForm
          tenant={editingTenant}
          onSubmit={handleSubmit}
          loading={formLoading}
        />
      </Drawer>
    </div>
  );
}
