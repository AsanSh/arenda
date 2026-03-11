import React, { useState, useEffect } from 'react';
import { Plus, Trash2 } from 'lucide-react';

interface AdditionalContact {
  name: string;
  phone: string;
}

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
  additional_contacts?: AdditionalContact[];
}

/** Только типы контрагентов (не сотрудники). Сотрудники — в Настройки → Сотрудники. */
const TENANT_TYPES = [
  { value: 'tenant', label: 'Арендатор' },
  { value: 'landlord', label: 'Арендодатель' },
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
    additional_contacts: [],
  });

  useEffect(() => {
    if (tenant) {
      setFormData({
        ...tenant,
        additional_contacts: tenant.additional_contacts || [],
      });
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

      {/* Доп. контактные лица — сразу под основным контактом */}
      <div className="p-3 bg-slate-50 rounded-lg border border-slate-200">
        <div className="flex items-center justify-between mb-2">
          <span className="text-xs font-semibold text-slate-700">Дополнительные контакты (ФИО + Телефон)</span>
          <button
            type="button"
            onClick={() => setFormData({
              ...formData,
              additional_contacts: [...(formData.additional_contacts || []), { name: '', phone: '' }],
            })}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-white bg-indigo-600 rounded-lg hover:bg-indigo-700 transition-colors shadow-sm"
          >
            <Plus className="h-4 w-4" />
            Добавить
          </button>
        </div>
        {(formData.additional_contacts || []).length === 0 ? (
          <p className="text-xs text-slate-500 italic">Нажмите «+ Добавить» для добавления контакта</p>
        ) : (
          <div className="space-y-2">
            {(formData.additional_contacts || []).map((ac, idx) => (
              <div key={idx} className="flex gap-2 items-start p-2 bg-white rounded border border-slate-200">
                <div className="flex-1 grid grid-cols-1 sm:grid-cols-2 gap-2">
                  <input
                    type="text"
                    placeholder="ФИО"
                    value={ac.name}
                    onChange={(e) => {
                      const updated = [...(formData.additional_contacts || [])];
                      updated[idx] = { ...updated[idx], name: e.target.value };
                      setFormData({ ...formData, additional_contacts: updated });
                    }}
                    className="w-full px-2 py-1.5 text-xs border border-gray-300 rounded focus:ring-primary-500 focus:border-primary-500"
                  />
                  <input
                    type="tel"
                    placeholder="Телефон"
                    value={ac.phone}
                    onChange={(e) => {
                      const updated = [...(formData.additional_contacts || [])];
                      updated[idx] = { ...updated[idx], phone: e.target.value };
                      setFormData({ ...formData, additional_contacts: updated });
                    }}
                    className="w-full px-2 py-1.5 text-xs border border-gray-300 rounded focus:ring-primary-500 focus:border-primary-500"
                  />
                </div>
                <button
                  type="button"
                  onClick={() => setFormData({
                    ...formData,
                    additional_contacts: (formData.additional_contacts || []).filter((_, i) => i !== idx),
                  })}
                  className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded transition-colors shrink-0"
                  title="Удалить"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      <div>
        <label className="block text-xs font-medium text-gray-700 mb-0.5">
          Email
        </label>
        <input
          type="email"
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
