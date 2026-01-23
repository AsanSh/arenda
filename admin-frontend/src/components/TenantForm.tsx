import React, { useState, useEffect } from 'react';
import client from '../api/client';

interface Tenant {
  id?: number;
  name: string;
  type: string;
  contact_person: string;
  email: string;
  phone: string;
  inn: string;
  address: string;
  comment: string;
}

const TENANT_TYPES = [
  { value: 'tenant', label: 'Арендатор' },
  { value: 'landlord', label: 'Арендодатель' },
  { value: 'staff', label: 'Сотрудник' },
  { value: 'master', label: 'Мастер' },
  { value: 'company_owner', label: 'Владелец компании' },
  { value: 'property_owner', label: 'Хозяин недвижимости' },
  { value: 'investor', label: 'Инвестор' },
];

interface TenantFormProps {
  tenant: Tenant | null;
  onSubmit: (data: Tenant) => Promise<void>;
  loading?: boolean;
}

export default function TenantForm({ tenant, onSubmit, loading = false }: TenantFormProps) {
  const [formData, setFormData] = useState<Tenant>({
    name: '',
    type: 'tenant',
    contact_person: '',
    email: '',
    phone: '',
    inn: '',
    address: '',
    comment: '',
  });

  useEffect(() => {
    if (tenant) {
      setFormData(tenant);
    }
  }, [tenant]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    await onSubmit(formData);
  };

  return (
    <form id="tenant-form" onSubmit={handleSubmit} className="space-y-2">
      <div>
        <label className="block text-xs font-medium text-gray-700 mb-0.5">
          Название *
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
          Тип *
        </label>
        <select
          required
          value={formData.type}
          onChange={(e) => setFormData({ ...formData, type: e.target.value })}
          className="w-full px-2 py-1 text-xs border border-gray-300 rounded focus:ring-primary-500 focus:border-primary-500"
        >
          {TENANT_TYPES.map((type) => (
            <option key={type.value} value={type.value}>
              {type.label}
            </option>
          ))}
        </select>
      </div>

      <div>
        <label className="block text-xs font-medium text-gray-700 mb-0.5">
          Контактное лицо
        </label>
        <input
          type="text"
          value={formData.contact_person}
          onChange={(e) => setFormData({ ...formData, contact_person: e.target.value })}
          className="w-full px-2 py-1 text-xs border border-gray-300 rounded focus:ring-primary-500 focus:border-primary-500"
        />
      </div>

      <div>
        <label className="block text-xs font-medium text-gray-700 mb-0.5">
          Email *
        </label>
        <input
          type="email"
          required
          value={formData.email}
          onChange={(e) => setFormData({ ...formData, email: e.target.value })}
          className="w-full px-2 py-1 text-xs border border-gray-300 rounded focus:ring-primary-500 focus:border-primary-500"
        />
      </div>

      <div>
        <label className="block text-xs font-medium text-gray-700 mb-0.5">
          Телефон *
        </label>
        <input
          type="tel"
          required
          value={formData.phone}
          onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
          className="w-full px-2 py-1 text-xs border border-gray-300 rounded focus:ring-primary-500 focus:border-primary-500"
        />
      </div>

      <div>
        <label className="block text-xs font-medium text-gray-700 mb-0.5">
          ИНН
        </label>
        <input
          type="text"
          value={formData.inn}
          onChange={(e) => setFormData({ ...formData, inn: e.target.value })}
          className="w-full px-2 py-1 text-xs border border-gray-300 rounded focus:ring-primary-500 focus:border-primary-500"
        />
      </div>

      <div>
        <label className="block text-xs font-medium text-gray-700 mb-0.5">
          Адрес
        </label>
        <textarea
          value={formData.address}
          onChange={(e) => setFormData({ ...formData, address: e.target.value })}
          rows={2}
          className="w-full px-2 py-1 text-xs border border-gray-300 rounded focus:ring-primary-500 focus:border-primary-500"
        />
      </div>

      <div>
        <label className="block text-xs font-medium text-gray-700 mb-0.5">
          Комментарий
        </label>
        <textarea
          value={formData.comment}
          onChange={(e) => setFormData({ ...formData, comment: e.target.value })}
          rows={2}
          className="w-full px-2 py-1 text-xs border border-gray-300 rounded focus:ring-primary-500 focus:border-primary-500"
        />
      </div>

    </form>
  );
}
