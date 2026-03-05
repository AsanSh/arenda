import React, { useState, useEffect } from 'react';
import client from '../api/client';

export interface Employee {
  id?: number;
  name: string;
  type: string;
  type_display?: string;
  contact_person: string;
  email: string;
  phone: string;
  inn?: string;
  address?: string;
  comment?: string;
}

const EMPLOYEE_TYPES = [
  { value: 'admin', label: 'Администратор' },
  { value: 'staff', label: 'Сотрудник' },
  { value: 'master', label: 'Мастер' },
  { value: 'accounting', label: 'Бухгалтерия' },
  { value: 'sales', label: 'Продажи' },
];

interface EmployeeFormProps {
  employee: Employee | null;
  onSubmit: (data: Employee) => Promise<void>;
  onCancel?: () => void;
  loading?: boolean;
}

export default function EmployeeForm({ employee, onSubmit, onCancel, loading = false }: EmployeeFormProps) {
  const [formData, setFormData] = useState<Employee>({
    name: '',
    type: 'staff',
    contact_person: '',
    email: '',
    phone: '',
    inn: '',
    address: '',
    comment: '',
  });

  useEffect(() => {
    if (employee) {
      setFormData({
        name: employee.name,
        type: employee.type,
        contact_person: employee.contact_person || '',
        email: employee.email || '',
        phone: employee.phone || '',
        inn: employee.inn || '',
        address: employee.address || '',
        comment: employee.comment || '',
      });
    }
  }, [employee]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    await onSubmit(formData);
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-3">
      <div>
        <label className="block text-xs font-medium text-gray-700 mb-0.5">Название / ФИО *</label>
        <input
          type="text"
          required
          value={formData.name}
          onChange={(e) => setFormData({ ...formData, name: e.target.value })}
          className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
          placeholder="Иванов Иван"
        />
      </div>
      <div>
        <label className="block text-xs font-medium text-gray-700 mb-0.5">Тип *</label>
        <select
          required
          value={formData.type}
          onChange={(e) => setFormData({ ...formData, type: e.target.value })}
          className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
        >
          {EMPLOYEE_TYPES.map((t) => (
            <option key={t.value} value={t.value}>{t.label}</option>
          ))}
        </select>
      </div>
      <div>
        <label className="block text-xs font-medium text-gray-700 mb-0.5">Телефон (для входа по WhatsApp)</label>
        <input
          type="tel"
          value={formData.phone}
          onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
          className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
          placeholder="+996 555 123 456"
        />
      </div>
      <div>
        <label className="block text-xs font-medium text-gray-700 mb-0.5">Email</label>
        <input
          type="email"
          value={formData.email}
          onChange={(e) => setFormData({ ...formData, email: e.target.value })}
          className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
          placeholder="email@example.com"
        />
      </div>
      <div>
        <label className="block text-xs font-medium text-gray-700 mb-0.5">Контактное лицо</label>
        <input
          type="text"
          value={formData.contact_person}
          onChange={(e) => setFormData({ ...formData, contact_person: e.target.value })}
          className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
        />
      </div>
      <div className="flex gap-2 pt-2">
        <button
          type="submit"
          disabled={loading}
          className="px-4 py-2 text-sm font-medium text-white bg-indigo-600 rounded-lg hover:bg-indigo-700 disabled:opacity-50"
        >
          {loading ? 'Сохранение...' : 'Сохранить'}
        </button>
        {onCancel && (
          <button type="button" onClick={onCancel} className="px-4 py-2 text-sm font-medium text-slate-600 bg-slate-100 rounded-lg hover:bg-slate-200">
            Отмена
          </button>
        )}
      </div>
    </form>
  );
}
