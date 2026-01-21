import React, { useState, useEffect } from 'react';
import { PlusIcon } from '@heroicons/react/24/outline';
import client from '../api/client';
import Drawer from '../components/Drawer';
import TenantForm from '../components/TenantForm';
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

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Контрагенты</h1>
        <button
          onClick={handleAdd}
          className="flex items-center px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700"
        >
          <PlusIcon className="h-5 w-5 mr-2" />
          Добавить
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

      <div className="bg-white shadow rounded-lg overflow-hidden">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Название
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Тип
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Контактное лицо
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Email
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Телефон
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                ИНН
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Действия
              </th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {tenants.map((tenant, index) => (
              <tr key={tenant.id} className={index % 2 === 0 ? 'bg-white' : 'bg-primary-50'}>
                <td className="px-4 py-2 whitespace-nowrap text-sm font-medium text-gray-900">
                  {tenant.name}
                </td>
                <td className="px-4 py-2 whitespace-nowrap text-sm text-gray-500">
                  {tenant.type_display || tenant.type}
                </td>
                <td className="px-4 py-2 whitespace-nowrap text-sm text-gray-500">
                  {tenant.contact_person || '-'}
                </td>
                <td className="px-4 py-2 whitespace-nowrap text-sm text-gray-500">
                  {tenant.email || '-'}
                </td>
                <td className="px-4 py-2 whitespace-nowrap text-sm text-gray-500">
                  {tenant.phone || '-'}
                </td>
                <td className="px-4 py-2 whitespace-nowrap text-sm text-gray-500">
                  {tenant.inn || '-'}
                </td>
                <td className="px-4 py-2 whitespace-nowrap text-sm text-gray-500">
                  <div className="flex space-x-3">
                    <button
                      onClick={() => handleEdit(tenant)}
                      className="text-primary-600 hover:text-primary-900"
                    >
                      Редактировать
                    </button>
                    <button
                      onClick={() => handleDelete(tenant)}
                      className="text-red-600 hover:text-red-900"
                    >
                      Удалить
                    </button>
                  </div>
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
