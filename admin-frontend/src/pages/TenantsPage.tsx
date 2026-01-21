import React, { useState, useEffect } from 'react';
import { PlusIcon, UserIcon, BriefcaseIcon } from '@heroicons/react/24/outline';
import client from '../api/client';
import Drawer from '../components/Drawer';
import TenantForm from '../components/TenantForm';
import TableActions from '../components/TableActions';
import PeriodFilterBar from '../components/PeriodFilterBar';
import { DatePreset } from '../utils/datePresets';

interface Tenant {
  id: number;
  name: string;
  type: string;
  type_display?: string;
  contact_person: string;
  email: string;
  phone: string;
  inn: string;
  address: string;
  comment: string;
}

export default function TenantsPage() {
  const [tenants, setTenants] = useState<Tenant[]>([]);
  const [loading, setLoading] = useState(true);
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const [editingTenant, setEditingTenant] = useState<Tenant | null>(null);
  const [filters, setFilters] = useState({
    type: '',
    search: '',
  });
  const [dateFilter, setDateFilter] = useState<{ preset: DatePreset | null; from: string | null; to: string | null }>({
    preset: null,
    from: null,
    to: null,
  });

  useEffect(() => {
    fetchTenants();
  }, [filters, dateFilter]);

  const fetchTenants = async () => {
    try {
      let url = '/tenants/';
      const params = new URLSearchParams();
      
      if (filters.type) params.append('type', filters.type);
      if (filters.search) params.append('search', filters.search);
      
      if (dateFilter.from) params.append('created_at__gte', dateFilter.from);
      if (dateFilter.to) params.append('created_at__lte', dateFilter.to);
      
      if (params.toString()) {
        url += `?${params.toString()}`;
      }
      
      const response = await client.get(url);
      setTenants(response.data.results || response.data);
      setLoading(false);
    } catch (error) {
      console.error('Error fetching tenants:', error);
      setLoading(false);
    }
  };

  const handleSave = () => {
    setIsDrawerOpen(false);
    setEditingTenant(null);
    fetchTenants();
  };

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

  if (loading) {
    return <div className="text-center py-12">Загрузка...</div>;
  }

  const getTypeIcon = (type: string) => {
    if (type === 'tenant') return <UserIcon className="h-4 w-4" />;
    if (type === 'landlord') return <BriefcaseIcon className="h-4 w-4" />;
    return <UserIcon className="h-4 w-4" />;
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-slate-900">Контрагенты</h1>
          <p className="mt-1 text-sm text-slate-500">Управление контрагентами и контактами</p>
        </div>
        <button
          onClick={handleAdd}
          className="flex items-center gap-2 px-4 py-2.5 bg-indigo-600 text-white rounded-card shadow-medium hover:bg-indigo-700 transition-colors font-medium"
        >
          <PlusIcon className="h-5 w-5" />
          Добавить
        </button>
      </div>

      {/* Фильтры */}
      <div className="bg-white p-4 rounded-card shadow-medium border border-slate-200">
        <div className="flex items-end gap-3">
          <div className="flex-shrink-0">
            <label className="block text-xs font-medium text-gray-700 mb-1">Период</label>
            <PeriodFilterBar
              value={dateFilter}
              onChange={setDateFilter}
              urlParamPrefix="created_at"
            />
          </div>
          <div className="flex-shrink-0 min-w-[140px]">
            <label className="block text-xs font-medium text-gray-700 mb-1">Тип</label>
            <select
              value={filters.type}
              onChange={(e) => setFilters({ ...filters, type: e.target.value })}
              className="w-full px-2 py-1 text-xs border border-gray-300 rounded focus:ring-primary-500 focus:border-primary-500"
            >
              <option value="">Все</option>
              <option value="tenant">Арендатор</option>
              <option value="landlord">Арендодатель</option>
              <option value="staff">Сотрудник</option>
              <option value="master">Мастер</option>
              <option value="company_owner">Владелец компании</option>
              <option value="property_owner">Хозяин недвижимости</option>
              <option value="investor">Инвестор</option>
            </select>
          </div>
          <div className="flex-1 min-w-[200px]">
            <label className="block text-xs font-medium text-gray-700 mb-1">Поиск</label>
            <input
              type="text"
              placeholder="Название, email, телефон..."
              value={filters.search}
              onChange={(e) => setFilters({ ...filters, search: e.target.value })}
              className="w-full px-2 py-1 text-xs border border-gray-300 rounded focus:ring-primary-500 focus:border-primary-500"
            />
          </div>
        </div>
      </div>

      <div className="bg-white rounded-card shadow-medium border border-slate-200 overflow-hidden">
        <table className="min-w-full divide-y divide-slate-200">
          <thead className="bg-slate-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-semibold text-slate-600 uppercase tracking-wider">
                Название
              </th>
              <th className="px-6 py-3 text-left text-xs font-semibold text-slate-600 uppercase tracking-wider">
                Тип
              </th>
              <th className="px-6 py-3 text-left text-xs font-semibold text-slate-600 uppercase tracking-wider">
                Контактное лицо
              </th>
              <th className="px-6 py-3 text-left text-xs font-semibold text-slate-600 uppercase tracking-wider">
                Email
              </th>
              <th className="px-6 py-3 text-left text-xs font-semibold text-slate-600 uppercase tracking-wider">
                Телефон
              </th>
              <th className="px-6 py-3 text-left text-xs font-semibold text-slate-600 uppercase tracking-wider">
                ИНН
              </th>
              <th className="px-6 py-3 text-right text-xs font-semibold text-slate-600 uppercase tracking-wider">
                Действия
              </th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-slate-200">
            {tenants.map((tenant) => (
              <tr key={tenant.id} className="hover:bg-slate-50 transition-colors group">
                <td className="px-6 py-4 whitespace-nowrap">
                  <div className="text-sm font-medium text-slate-900">{tenant.name}</div>
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <div className="flex items-center gap-2 text-sm text-slate-600">
                    <span className="text-slate-400">{getTypeIcon(tenant.type)}</span>
                    {tenant.type_display || tenant.type}
                  </div>
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <div className="text-sm text-slate-600">
                    {tenant.contact_person || <span className="text-slate-400 italic">Not set</span>}
                  </div>
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <div className="text-sm text-slate-600">
                    {tenant.email || <span className="text-slate-400 italic">Not set</span>}
                  </div>
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <div className="text-sm text-slate-600">
                    {tenant.phone || <span className="text-slate-400 italic">Not set</span>}
                  </div>
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <div className="text-sm text-slate-600">
                    {tenant.inn || <span className="text-slate-400 italic">Not set</span>}
                  </div>
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-right">
                  <TableActions
                    onEdit={() => handleEdit(tenant)}
                    onDelete={() => handleDelete(tenant)}
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
          setEditingTenant(null);
        }}
        title={editingTenant ? 'Редактировать контрагента' : 'Добавить контрагента'}
      >
        <TenantForm
          tenant={editingTenant}
          onSave={handleSave}
          onCancel={() => {
            setIsDrawerOpen(false);
            setEditingTenant(null);
          }}
        />
      </Drawer>
    </div>
  );
}
