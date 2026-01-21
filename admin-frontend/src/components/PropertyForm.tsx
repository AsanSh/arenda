import React, { useState, useEffect } from 'react';
import client from '../api/client';

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

interface PropertyFormProps {
  property: Property | null;
  onSave: () => void;
  onCancel: () => void;
}

const PROPERTY_TYPES = [
  { value: 'office', label: 'Офис' },
  { value: 'shop', label: 'Магазин' },
  { value: 'medical', label: 'Медкабинет' },
  { value: 'apartment', label: 'Квартира' },
  { value: 'warehouse', label: 'Склад' },
  { value: 'other', label: 'Прочее' },
];

const STATUSES = [
  { value: 'free', label: 'Свободен' },
  { value: 'rented', label: 'Сдан' },
  { value: 'reserved', label: 'Бронь' },
  { value: 'inactive', label: 'Неактивен' },
];

export default function PropertyForm({ property, onSave, onCancel }: PropertyFormProps) {
  const [formData, setFormData] = useState<Property>({
    name: '',
    property_type: 'office',
    address: '',
    area: 0,
    status: 'free',
    block_floor_room: '',
    owner: '',
    comment: '',
  });
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (property) {
      setFormData(property);
    }
  }, [property]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      if (property?.id) {
        await client.patch(`/properties/${property.id}/`, formData);
      } else {
        await client.post('/properties/', formData);
      }
      onSave();
    } catch (error) {
      console.error('Error saving property:', error);
      alert('Ошибка при сохранении');
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-2">
      <div>
        <label className="block text-xs font-medium text-gray-700 mb-0.5">
          Название объекта *
        </label>
        <input
          type="text"
          required
          value={formData.name}
          onChange={(e) => setFormData({ ...formData, name: e.target.value })}
          className="w-full px-2 py-1 text-xs border border-gray-300 rounded focus:ring-primary-500 focus:border-primary-500"
        />
      </div>

      <div>
        <label className="block text-xs font-medium text-gray-700 mb-0.5">
          Тип недвижимости *
        </label>
        <select
          required
          value={formData.property_type}
          onChange={(e) => setFormData({ ...formData, property_type: e.target.value })}
          className="w-full px-2 py-1 text-xs border border-gray-300 rounded focus:ring-primary-500 focus:border-primary-500"
        >
          {PROPERTY_TYPES.map((type) => (
            <option key={type.value} value={type.value}>
              {type.label}
            </option>
          ))}
        </select>
      </div>

      <div>
        <label className="block text-xs font-medium text-gray-700 mb-0.5">
          Адрес *
        </label>
        <input
          type="text"
          required
          value={formData.address}
          onChange={(e) => setFormData({ ...formData, address: e.target.value })}
          className="w-full px-2 py-1 text-xs border border-gray-300 rounded focus:ring-primary-500 focus:border-primary-500"
        />
      </div>

      <div>
        <label className="block text-xs font-medium text-gray-700 mb-0.5">
          Площадь м² *
        </label>
        <input
          type="number"
          required
          min="0"
          step="0.01"
          value={formData.area}
          onChange={(e) => setFormData({ ...formData, area: parseFloat(e.target.value) || 0 })}
          className="w-full px-2 py-1 text-xs border border-gray-300 rounded focus:ring-primary-500 focus:border-primary-500"
        />
      </div>

      <div>
        <label className="block text-xs font-medium text-gray-700 mb-0.5">
          Статус
        </label>
        <select
          value={formData.status}
          onChange={(e) => setFormData({ ...formData, status: e.target.value })}
          className="w-full px-2 py-1 text-xs border border-gray-300 rounded focus:ring-primary-500 focus:border-primary-500"
        >
          {STATUSES.map((status) => (
            <option key={status.value} value={status.value}>
              {status.label}
            </option>
          ))}
        </select>
      </div>

      <div>
        <label className="block text-xs font-medium text-gray-700 mb-0.5">
          Блок/Этаж/№ помещения
        </label>
        <input
          type="text"
          value={formData.block_floor_room || ''}
          onChange={(e) => setFormData({ ...formData, block_floor_room: e.target.value })}
          className="w-full px-2 py-1 text-xs border border-gray-300 rounded focus:ring-primary-500 focus:border-primary-500"
        />
      </div>

      <div>
        <label className="block text-xs font-medium text-gray-700 mb-0.5">
          Владелец
        </label>
        <input
          type="text"
          value={formData.owner || ''}
          onChange={(e) => setFormData({ ...formData, owner: e.target.value })}
          className="w-full px-2 py-1 text-xs border border-gray-300 rounded focus:ring-primary-500 focus:border-primary-500"
        />
      </div>

      <div>
        <label className="block text-xs font-medium text-gray-700 mb-0.5">
          Комментарий
        </label>
        <textarea
          value={formData.comment || ''}
          onChange={(e) => setFormData({ ...formData, comment: e.target.value })}
          rows={2}
          className="w-full px-2 py-1 text-xs border border-gray-300 rounded focus:ring-primary-500 focus:border-primary-500"
        />
      </div>

      <div className="flex justify-end space-x-2 pt-2">
        <button
          type="button"
          onClick={onCancel}
          className="px-3 py-1.5 text-xs border border-gray-300 rounded text-gray-700 hover:bg-gray-50"
        >
          Отмена
        </button>
        <button
          type="submit"
          disabled={loading}
          className="px-3 py-1.5 text-xs bg-primary-600 text-white rounded hover:bg-primary-700 disabled:opacity-50"
        >
          {loading ? 'Сохранение...' : 'Сохранить'}
        </button>
      </div>
    </form>
  );
}
