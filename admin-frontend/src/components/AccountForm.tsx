import React, { useState, useEffect } from 'react';
import client from '../api/client';

interface Account {
  id?: number;
  name: string;
  account_type: string;
  currency: string;
  owner?: number | null;
  account_number?: string;
  bank_name?: string;
  is_active: boolean;
  comment?: string;
}

interface Tenant {
  id: number;
  name: string;
  type: string;
}

interface AccountFormProps {
  account: Account | null;
  onSave: () => void;
  onCancel: () => void;
}

const ACCOUNT_TYPES = [
  { value: 'cash', label: 'Наличные' },
  { value: 'bank', label: 'Банковский счет' },
];

const CURRENCIES = [
  { value: 'KGS', label: 'KGS (сомы)' },
  { value: 'USD', label: 'USD (доллары)' },
];

export default function AccountForm({ account, onSave, onCancel }: AccountFormProps) {
  const [tenants, setTenants] = useState<Tenant[]>([]);
  const [formData, setFormData] = useState<Account>({
    name: '',
    account_type: 'cash',
    currency: 'KGS',
    owner: null,
    account_number: account?.account_number || '',
    bank_name: account?.bank_name || '',
    is_active: account?.is_active ?? true,
    comment: account?.comment || '',
  });
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    fetchTenants();
    if (account) {
      setFormData(account);
    }
  }, [account]);

  const fetchTenants = async () => {
    try {
      const response = await client.get('/tenants/');
      // Фильтруем только арендодателей
      const landlords = (response.data.results || response.data).filter(
        (t: Tenant) => t.type === 'landlord' || t.type === 'property_owner' || t.type === 'company_owner'
      );
      setTenants(landlords);
    } catch (error) {
      console.error('Error fetching tenants:', error);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const payload = {
        ...formData,
        owner: formData.owner || null,
      };
      
      if (account?.id) {
        await client.patch(`/accounts/${account.id}/`, payload);
      } else {
        await client.post('/accounts/', payload);
      }
      onSave();
    } catch (error: any) {
      console.error('Error saving account:', error);
      alert(error.response?.data?.error || 'Ошибка при сохранении');
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-2">
      <div>
        <label className="block text-xs font-medium text-gray-700 mb-0.5">
          Название счета *
        </label>
        <input
          type="text"
          required
          value={formData.name}
          onChange={(e) => setFormData({ ...formData, name: e.target.value })}
          className="w-full px-2 py-1 text-xs border border-gray-300 rounded focus:ring-primary-500 focus:border-primary-500"
        />
      </div>

      <div className="grid grid-cols-2 gap-2">
        <div>
          <label className="block text-xs font-medium text-gray-700 mb-0.5">
            Тип счета *
          </label>
          <select
            required
            value={formData.account_type}
            onChange={(e) => setFormData({ ...formData, account_type: e.target.value })}
            className="w-full px-2 py-1 text-xs border border-gray-300 rounded focus:ring-primary-500 focus:border-primary-500"
          >
            {ACCOUNT_TYPES.map((type) => (
              <option key={type.value} value={type.value}>
                {type.label}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className="block text-xs font-medium text-gray-700 mb-0.5">
            Валюта *
          </label>
          <select
            required
            value={formData.currency}
            onChange={(e) => setFormData({ ...formData, currency: e.target.value })}
            className="w-full px-2 py-1 text-xs border border-gray-300 rounded focus:ring-primary-500 focus:border-primary-500"
          >
            {CURRENCIES.map((curr) => (
              <option key={curr.value} value={curr.value}>
                {curr.label}
              </option>
            ))}
          </select>
        </div>
      </div>

      <div>
        <label className="block text-xs font-medium text-gray-700 mb-0.5">
          Владелец (контрагент)
        </label>
        <select
          value={formData.owner || ''}
          onChange={(e) => setFormData({ ...formData, owner: e.target.value ? parseInt(e.target.value) : null })}
          className="w-full px-2 py-1 text-xs border border-gray-300 rounded focus:ring-primary-500 focus:border-primary-500"
        >
          <option value="">Общий счет</option>
          {tenants.map((tenant) => (
            <option key={tenant.id} value={tenant.id}>
              {tenant.name}
            </option>
          ))}
        </select>
      </div>

      {formData.account_type === 'bank' && (
        <>
          <div>
            <label className="block text-xs font-medium text-gray-700 mb-0.5">
              Номер счета
            </label>
            <input
              type="text"
              value={formData.account_number}
              onChange={(e) => setFormData({ ...formData, account_number: e.target.value })}
              className="w-full px-2 py-1 text-xs border border-gray-300 rounded focus:ring-primary-500 focus:border-primary-500"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-700 mb-0.5">
              Название банка
            </label>
            <input
              type="text"
              value={formData.bank_name}
              onChange={(e) => setFormData({ ...formData, bank_name: e.target.value })}
              className="w-full px-2 py-1 text-xs border border-gray-300 rounded focus:ring-primary-500 focus:border-primary-500"
            />
          </div>
        </>
      )}

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

      <div className="flex items-center">
        <input
          type="checkbox"
          checked={formData.is_active}
          onChange={(e) => setFormData({ ...formData, is_active: e.target.checked })}
          className="h-4 w-4 text-primary-600 focus:ring-primary-500 border-gray-300 rounded"
        />
        <label className="ml-2 block text-xs text-gray-700">
          Активен
        </label>
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
