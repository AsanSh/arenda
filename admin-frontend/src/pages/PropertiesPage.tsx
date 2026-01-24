import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { Plus, Search, ChevronUp, ChevronDown } from 'lucide-react';
import client from '../api/client';
import Drawer from '../components/Drawer';
import PropertyForm from '../components/PropertyForm';
import PeriodFilterBar from '../components/PeriodFilterBar';
import ActionsMenu from '../components/ui/ActionsMenu';
import { useDensity } from '../contexts/DensityContext';
import { useUser } from '../contexts/UserContext';
import { useCompactStyles } from '../hooks/useCompactStyles';
import { DatePreset } from '../utils/datePresets';

type SortField = 'name' | 'property_type' | 'address' | 'area' | 'status';
type SortDirection = 'asc' | 'desc';

interface Property {
  id?: number;
  name: string;
  property_type: string;
  address: string;
  area: number;
  status: string;
  block_floor_room?: string;
  owner?: string;
  comment?: string;
}

export default function PropertiesPage() {
  const { isCompact } = useDensity();
  const { user, canWrite } = useUser();
  const compact = useCompactStyles();
  const canEdit = canWrite('properties');
  const [properties, setProperties] = useState<Property[]>([]);
  const [loading, setLoading] = useState(true);
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const [editingProperty, setEditingProperty] = useState<Property | null>(null);
  const [filters, setFilters] = useState({
    property_type: '',
    status: '',
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
    fetchProperties();
  }, [filters, dateFilter, sortField, sortDirection]);

  const fetchProperties = async () => {
    try {
      let url = '/properties/';
      const params = new URLSearchParams();
      
      if (filters.property_type) params.append('property_type', filters.property_type);
      if (filters.status) params.append('status', filters.status);
      if (filters.search) params.append('search', filters.search);
      
      // Сортировка
      if (sortField) {
        const ordering = sortDirection === 'desc' ? `-${sortField}` : sortField;
        params.append('ordering', ordering);
      }
      
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

  const handleSubmit = useCallback(async (data: Property) => {
    setFormLoading(true);
    try {
      if (editingProperty?.id) {
        await client.patch(`/properties/${editingProperty.id}/`, data);
      } else {
        await client.post('/properties/', data);
      }
      setIsDrawerOpen(false);
      setEditingProperty(null);
      fetchProperties();
    } catch (error: any) {
      console.error('Error saving property:', error);
      const errorMessage = error?.response?.data?.detail || error?.response?.data?.error || 'Ошибка при сохранении';
      alert(errorMessage);
    } finally {
      setFormLoading(false);
    }
  }, [editingProperty]);

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
    <div className="space-y-2">
      {/* Header - Компактный */}
      <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-2">
        <div>
          <h1 className={compact.sectionHeader + ' text-gray-900'}>Недвижимость</h1>
        </div>
        {canEdit && (
          <button
            onClick={handleAdd}
            className={`flex items-center gap-1.5 ${compact.buttonPadding} bg-indigo-600 text-white rounded-lg shadow-sm hover:bg-indigo-700 transition-colors ${compact.buttonText} font-medium`}
          >
            <Plus className={compact.iconSize} />
            Добавить
          </button>
        )}
      </div>

      {/* Поиск - Компактный */}
      <div className={`bg-white ${compact.cardPaddingSmall} rounded-lg shadow-sm border border-gray-200`}>
        <div className="relative">
          <Search className={`absolute left-2 top-1/2 transform -translate-y-1/2 ${compact.iconSizeSmall} text-gray-400`} />
          <input
            type="text"
            placeholder="Название, адрес..."
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
            onClick={() => setFilters({ ...filters, property_type: '', status: '' })}
            className={`px-2 py-1 ${compact.smallText} font-medium rounded-lg transition-colors ${
              !filters.property_type && !filters.status
                ? 'bg-indigo-600 text-white'
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
          >
            Все объекты
          </button>
          <button
            onClick={() => setFilters({ ...filters, status: 'rented' })}
            className={`px-2 py-1 ${compact.smallText} font-medium rounded-lg transition-colors ${
              filters.status === 'rented'
                ? 'bg-indigo-600 text-white'
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
          >
            Сдано
          </button>
          <button
            onClick={() => setFilters({ ...filters, status: 'free' })}
            className={`px-2 py-1 ${compact.smallText} font-medium rounded-lg transition-colors ${
              filters.status === 'free'
                ? 'bg-indigo-600 text-white'
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
          >
            Свободно
          </button>
          <div className="ml-auto flex items-center gap-1.5">
            <select
              value={filters.property_type}
              onChange={(e) => setFilters({ ...filters, property_type: e.target.value })}
              className={`px-1.5 py-1 ${compact.smallText} border border-gray-300 rounded-lg focus:ring-1 focus:ring-indigo-500 focus:border-indigo-500`}
            >
              <option value="">Все типы</option>
              <option value="apartment">Квартира</option>
              <option value="office">Офис</option>
              <option value="warehouse">Склад</option>
              <option value="retail">Торговое помещение</option>
            </select>
            <PeriodFilterBar
              value={dateFilter}
              onChange={setDateFilter}
              urlParamPrefix="created_at"
            />
          </div>
        </div>
      </div>

      {/* Таблица - Компактная с адаптивностью */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
        {/* Desktop Table */}
        <div className="hidden md:block overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-100">
          <thead className="bg-gray-50">
            <tr>
              <th 
                className={`${compact.headerPadding} text-left ${compact.headerText} text-gray-500 tracking-wider cursor-pointer hover:bg-gray-100 transition-colors`}
                onClick={() => handleSort('name')}
              >
                Название {getSortIcon('name')}
              </th>
              <th 
                className={`${compact.headerPadding} text-left ${compact.headerText} text-gray-500 tracking-wider cursor-pointer hover:bg-gray-100 transition-colors`}
                onClick={() => handleSort('property_type')}
              >
                Тип {getSortIcon('property_type')}
              </th>
              <th 
                className={`${compact.headerPadding} text-left ${compact.headerText} text-gray-500 tracking-wider cursor-pointer hover:bg-gray-100 transition-colors hidden lg:table-cell`}
                onClick={() => handleSort('address')}
              >
                Адрес {getSortIcon('address')}
              </th>
              <th 
                className={`${compact.headerPadding} text-left ${compact.headerText} text-gray-500 tracking-wider cursor-pointer hover:bg-gray-100 transition-colors`}
                onClick={() => handleSort('area')}
              >
                Площадь {getSortIcon('area')}
              </th>
              <th 
                className={`${compact.headerPadding} text-left ${compact.headerText} text-gray-500 tracking-wider cursor-pointer hover:bg-gray-100 transition-colors`}
                onClick={() => handleSort('status')}
              >
                Статус {getSortIcon('status')}
              </th>
              <th className={`${compact.headerPadding} text-right ${compact.headerText} text-gray-500 tracking-wider`}>
                Действия
              </th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-100">
            {properties.map((property) => (
              <tr key={property.id} className={`hover:bg-slate-50 transition-colors group ${compact.rowHeight}`}>
                <td className={`${compact.cellPadding} whitespace-nowrap`}>
                  <div className={`${compact.tableText} font-medium text-gray-900`}>{property.name}</div>
                </td>
                <td className={`${compact.cellPadding} whitespace-nowrap`}>
                  <div className={`${compact.tableText} text-gray-500`}>{property.property_type}</div>
                </td>
                <td className={`${compact.cellPadding} hidden lg:table-cell`}>
                  <div className={`${compact.tableText} text-gray-500`}>{property.address}</div>
                </td>
                <td className={`${compact.cellPadding} whitespace-nowrap`}>
                  <div className={`${compact.tableText} text-gray-500`}>{property.area} м²</div>
                </td>
                <td className={`${compact.cellPadding} whitespace-nowrap`}>
                  <span className={`px-1.5 py-0.5 ${compact.smallText} rounded-full ${
                    property.status === 'rented' ? 'bg-green-100 text-green-800' :
                    property.status === 'free' ? 'bg-blue-100 text-blue-800' :
                    'bg-gray-100 text-gray-800'
                  }`}>
                    {property.status}
                  </span>
                </td>
                <td className={`${compact.cellPadding} whitespace-nowrap text-right`}>
                  <div className="flex justify-end items-center gap-1">
                    <button
                      onClick={() => handleEdit(property)}
                      className={`px-2 py-0.5 ${compact.smallText} font-medium text-indigo-600 bg-indigo-50 rounded hover:bg-indigo-100 transition-colors`}
                      title="Редактировать"
                    >
                      Редактировать
                    </button>
                    <ActionsMenu
                      items={[
                        { label: 'Удалить', onClick: () => handleDelete(property), variant: 'danger' },
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
        
        {/* Mobile Card List */}
        <div className="md:hidden divide-y divide-gray-100">
          {properties.map((property) => (
            <div key={property.id} className={`${compact.cardPadding} hover:bg-slate-50 transition-colors`}>
              <div className="flex justify-between items-start mb-2">
                <div className="flex-1 min-w-0">
                  <h3 className={`${compact.textSize} font-medium text-gray-900 mb-1`}>{property.name}</h3>
                  <p className={`${compact.smallText} text-gray-500`}>{property.address}</p>
                </div>
                <span className={`px-1.5 py-0.5 ${compact.smallText} rounded-full ml-2 ${
                  property.status === 'rented' ? 'bg-green-100 text-green-800' :
                  property.status === 'free' ? 'bg-blue-100 text-blue-800' :
                  'bg-gray-100 text-gray-800'
                }`}>
                  {property.status}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <div className="flex gap-3">
                  <span className={`${compact.smallText} text-gray-500`}>{property.property_type}</span>
                  <span className={`${compact.smallText} text-gray-500`}>{property.area} м²</span>
                </div>
                <div className="flex items-center gap-1">
                  {canEdit ? (
                    <>
                      <button
                        onClick={() => handleEdit(property)}
                        className={`px-2 py-1 ${compact.smallText} font-medium text-indigo-600 bg-indigo-50 rounded hover:bg-indigo-100 transition-colors min-h-[44px]`}
                      >
                        Редактировать
                      </button>
                      <ActionsMenu
                        items={[
                          { label: 'Удалить', onClick: () => handleDelete(property), variant: 'danger' },
                        ]}
                        alwaysVisible={true}
                      />
                    </>
                  ) : (
                    <button
                      onClick={() => {
                        window.location.href = `/requests?type=PROPERTY_ISSUE&related_property=${property.id}`;
                      }}
                      className={`px-2 py-1 ${compact.smallText} font-medium text-indigo-600 bg-indigo-50 rounded hover:bg-indigo-100 transition-colors min-h-[44px]`}
                    >
                      Запросить изменение
                    </button>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      <Drawer
        isOpen={isDrawerOpen}
        onClose={() => {
          setIsDrawerOpen(false);
          setEditingProperty(null);
        }}
        title={editingProperty ? 'Редактировать объект' : 'Добавить объект'}
        footer={
          <div className="flex gap-3 justify-end">
            <button
              type="button"
              onClick={() => {
                setIsDrawerOpen(false);
                setEditingProperty(null);
              }}
              className="px-4 py-2 text-sm font-medium text-slate-700 bg-white border border-slate-300 rounded-card hover:bg-slate-50 transition-colors"
            >
              Отмена
            </button>
            <button
              type="submit"
              form="property-form"
              disabled={formLoading}
              className="px-4 py-2 text-sm font-medium text-white bg-indigo-600 rounded-card hover:bg-indigo-700 transition-colors disabled:opacity-50"
            >
              {formLoading ? 'Сохранение...' : 'Сохранить'}
            </button>
          </div>
        }
      >
        <PropertyForm
          property={editingProperty}
          onSubmit={handleSubmit}
          loading={formLoading}
        />
      </Drawer>
    </div>
  );
}
