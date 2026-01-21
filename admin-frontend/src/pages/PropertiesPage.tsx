import React, { useState, useEffect } from 'react';
import { PlusIcon } from '@heroicons/react/24/outline';
import client from '../api/client';
import Drawer from '../components/Drawer';
import PropertyForm from '../components/PropertyForm';
import PeriodFilterBar from '../components/PeriodFilterBar';
import { DatePreset } from '../utils/datePresets';

interface Property {
  id: number;
  name: string;
  property_type: string;
  address: string;
  area: number;
  status: string;
}

export default function PropertiesPage() {
  const [properties, setProperties] = useState<Property[]>([]);
  const [loading, setLoading] = useState(true);
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const [editingProperty, setEditingProperty] = useState<Property | null>(null);
  const [filters, setFilters] = useState({
    property_type: '',
    status: '',
    search: '',
  });
  const [dateFilter, setDateFilter] = useState<{ preset: DatePreset | null; from: string | null; to: string | null }>({
    preset: null,
    from: null,
    to: null,
  });

  useEffect(() => {
    fetchProperties();
  }, [filters, dateFilter]);

  const fetchProperties = async () => {
    try {
      let url = '/properties/';
      const params = new URLSearchParams();
      
      if (filters.property_type) params.append('property_type', filters.property_type);
      if (filters.status) params.append('status', filters.status);
      if (filters.search) params.append('search', filters.search);
      
      if (dateFilter.from) params.append('created_at__gte', dateFilter.from);
      if (dateFilter.to) params.append('created_at__lte', dateFilter.to);
      
      if (params.toString()) {
        url += `?${params.toString()}`;
      }
      
      const response = await client.get(url);
      setProperties(response.data.results || response.data);
      setLoading(false);
    } catch (error) {
      console.error('Error fetching properties:', error);
      setLoading(false);
    }
  };

  const handleSave = () => {
    setIsDrawerOpen(false);
    setEditingProperty(null);
    fetchProperties();
  };

  const handleEdit = (property: Property) => {
    setEditingProperty(property);
    setIsDrawerOpen(true);
  };

  const handleAdd = () => {
    setEditingProperty(null);
    setIsDrawerOpen(true);
  };

  const handleDelete = async (property: Property) => {
    if (!window.confirm(`Вы уверены, что хотите удалить объект "${property.name}"?`)) {
      return;
    }

    try {
      await client.delete(`/properties/${property.id}/`);
      fetchProperties();
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
        <h1 className="text-2xl font-bold text-gray-900">Недвижимость</h1>
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
          <div className="flex-shrink-0 min-w-[120px]">
            <label className="block text-xs font-medium text-gray-700 mb-1">Тип</label>
            <select
              value={filters.property_type}
              onChange={(e) => setFilters({ ...filters, property_type: e.target.value })}
              className="w-full px-2 py-1 text-xs border border-gray-300 rounded focus:ring-primary-500 focus:border-primary-500"
            >
              <option value="">Все</option>
              <option value="apartment">Квартира</option>
              <option value="office">Офис</option>
              <option value="warehouse">Склад</option>
              <option value="retail">Торговое помещение</option>
            </select>
          </div>
          <div className="flex-shrink-0 min-w-[120px]">
            <label className="block text-xs font-medium text-gray-700 mb-1">Статус</label>
            <select
              value={filters.status}
              onChange={(e) => setFilters({ ...filters, status: e.target.value })}
              className="w-full px-2 py-1 text-xs border border-gray-300 rounded focus:ring-primary-500 focus:border-primary-500"
            >
              <option value="">Все</option>
              <option value="free">Свободно</option>
              <option value="rented">Сдано</option>
            </select>
          </div>
          <div className="flex-1 min-w-[200px]">
            <label className="block text-xs font-medium text-gray-700 mb-1">Поиск</label>
            <input
              type="text"
              placeholder="Название, адрес..."
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
                Название
              </th>
              <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 tracking-wider">
                Тип
              </th>
              <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 tracking-wider">
                Адрес
              </th>
              <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 tracking-wider">
                Площадь
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
            {properties.map((property, index) => (
              <tr key={property.id} className={index % 2 === 0 ? 'bg-white' : 'bg-primary-50'}>
                <td className="px-4 py-2 whitespace-nowrap text-sm font-medium text-gray-900">
                  {property.name}
                </td>
                <td className="px-4 py-2 whitespace-nowrap text-sm text-gray-500">
                  {property.property_type}
                </td>
                <td className="px-4 py-2 text-sm text-gray-500">
                  {property.address}
                </td>
                <td className="px-4 py-2 whitespace-nowrap text-sm text-gray-500">
                  {property.area} м²
                </td>
                <td className="px-4 py-2 whitespace-nowrap">
                  <span className={`px-2 py-1 text-xs rounded-full ${
                    property.status === 'rented' ? 'bg-green-100 text-green-800' :
                    property.status === 'free' ? 'bg-blue-100 text-blue-800' :
                    'bg-gray-100 text-gray-800'
                  }`}>
                    {property.status}
                  </span>
                </td>
                <td className="px-4 py-2 whitespace-nowrap text-sm text-gray-500">
                  <div className="flex space-x-3">
                    <button
                      onClick={() => handleEdit(property)}
                      className="text-primary-600 hover:text-primary-900"
                    >
                      Редактировать
                    </button>
                    <button
                      onClick={() => handleDelete(property)}
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
          setEditingProperty(null);
        }}
        title={editingProperty ? 'Редактировать объект' : 'Добавить объект'}
      >
        <PropertyForm
          property={editingProperty}
          onSave={handleSave}
          onCancel={() => {
            setIsDrawerOpen(false);
            setEditingProperty(null);
          }}
        />
      </Drawer>
    </div>
  );
}
