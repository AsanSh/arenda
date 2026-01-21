import React, { useState, useEffect } from 'react';
import client from '../api/client';

interface Property {
  id: number;
  name: string;
}

interface Tenant {
  id: number;
  name: string;
}

interface Contract {
  id: number;
  signed_at: string;
  property: number;
  tenant: number;
  start_date: string;
  end_date: string;
  rent_amount: string;
  currency: string;
  exchange_rate_source: string;
  due_day: number;
  deposit_enabled: boolean;
  deposit_amount: string;
  advance_enabled: boolean;
  advance_months: number;
  status: string;
  comment: string;
}

interface ContractFormProps {
  contract?: Contract | null;
  onSave: () => void;
  onCancel: () => void;
}

export default function ContractForm({ contract, onSave, onCancel }: ContractFormProps) {
  const [properties, setProperties] = useState<Property[]>([]);
  const [tenants, setTenants] = useState<Tenant[]>([]);
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    signed_at: contract?.signed_at || '',
    property: contract?.property?.toString() || '',
    tenant: contract?.tenant?.toString() || '',
    start_date: contract?.start_date || '',
    end_date: contract?.end_date || '',
    rent_amount: contract?.rent_amount || '',
    currency: contract?.currency || 'KGS',
    exchange_rate_source: contract?.exchange_rate_source || 'nbkr',
    due_day: contract?.due_day || 25,
    deposit_enabled: contract?.deposit_enabled || false,
    deposit_amount: contract?.deposit_amount || '',
    advance_enabled: contract?.advance_enabled || false,
    advance_months: contract?.advance_months || 1,
    status: contract?.status || 'draft',
    comment: contract?.comment || '',
  });

  useEffect(() => {
    fetchProperties();
    fetchTenants();
  }, []);

  useEffect(() => {
    if (contract) {
      setFormData({
        signed_at: contract.signed_at || '',
        property: contract.property?.toString() || '',
        tenant: contract.tenant?.toString() || '',
        start_date: contract.start_date || '',
        end_date: contract.end_date || '',
        rent_amount: contract.rent_amount || '',
        currency: contract.currency || 'KGS',
        exchange_rate_source: contract.exchange_rate_source || 'nbkr',
        due_day: contract.due_day || 25,
        deposit_enabled: contract.deposit_enabled || false,
        deposit_amount: contract.deposit_amount || '',
        advance_enabled: contract.advance_enabled || false,
        advance_months: contract.advance_months || 1,
        status: contract.status || 'draft',
        comment: contract.comment || '',
      });
    } else {
      // Сброс формы при создании нового договора
      setFormData({
        signed_at: '',
        property: '',
        tenant: '',
        start_date: '',
        end_date: '',
        rent_amount: '',
        currency: 'KGS',
        exchange_rate_source: 'nbkr',
        due_day: 25,
        deposit_enabled: false,
        deposit_amount: '',
        advance_enabled: false,
        advance_months: 1,
        status: 'draft',
        comment: '',
      });
    }
  }, [contract]);

  const fetchProperties = async () => {
    try {
      const response = await client.get('/properties/');
      setProperties(response.data.results || response.data);
    } catch (error) {
      console.error('Error fetching properties:', error);
    }
  };

  const fetchTenants = async () => {
    try {
      const response = await client.get('/tenants/');
      setTenants(response.data.results || response.data);
    } catch (error) {
      console.error('Error fetching tenants:', error);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      // Используем строки для точности, Django DecimalField сам преобразует
      const payload = {
        ...formData,
        property: parseInt(formData.property),
        tenant: parseInt(formData.tenant),
        rent_amount: formData.rent_amount, // Отправляем как строку для точности
        deposit_amount: formData.deposit_enabled ? formData.deposit_amount : '0',
      };
      
      if (contract?.id) {
        await client.patch(`/contracts/${contract.id}/`, payload);
      } else {
        await client.post('/contracts/', payload);
      }
      onSave();
    } catch (error: any) {
      console.error('Error saving contract:', error);
      alert(error.response?.data?.detail || error.response?.data?.error || 'Ошибка при сохранении');
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-2">
      <div>
        <label className="block text-xs font-medium text-gray-700 mb-0.5">
          Дата подписания *
        </label>
        <input
          type="date"
          required
          value={formData.signed_at}
          onChange={(e) => setFormData({ ...formData, signed_at: e.target.value })}
          className="w-full px-2 py-1 text-xs border border-gray-300 rounded focus:ring-primary-500 focus:border-primary-500"
        />
      </div>

      <div>
        <label className="block text-xs font-medium text-gray-700 mb-0.5">
          Объект недвижимости *
        </label>
        <select
          required
          value={formData.property}
          onChange={(e) => setFormData({ ...formData, property: e.target.value })}
          className="w-full px-2 py-1 text-xs border border-gray-300 rounded focus:ring-primary-500 focus:border-primary-500"
        >
          <option value="">Выберите объект</option>
          {properties.map((prop) => (
            <option key={prop.id} value={prop.id}>
              {prop.name}
            </option>
          ))}
        </select>
      </div>

      <div>
        <label className="block text-xs font-medium text-gray-700 mb-0.5">
          Арендатор *
        </label>
        <select
          required
          value={formData.tenant}
          onChange={(e) => setFormData({ ...formData, tenant: e.target.value })}
          className="w-full px-2 py-1 text-xs border border-gray-300 rounded focus:ring-primary-500 focus:border-primary-500"
        >
          <option value="">Выберите арендатора</option>
          {tenants.map((tenant) => (
            <option key={tenant.id} value={tenant.id}>
              {tenant.name}
            </option>
          ))}
        </select>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-xs font-medium text-gray-700 mb-0.5">
            Дата начала *
          </label>
          <input
            type="date"
            required
            value={formData.start_date}
            onChange={(e) => setFormData({ ...formData, start_date: e.target.value })}
            className="w-full px-2 py-1 text-xs border border-gray-300 rounded focus:ring-primary-500 focus:border-primary-500"
          />
        </div>
        <div>
          <label className="block text-xs font-medium text-gray-700 mb-0.5">
            Дата окончания *
          </label>
          <input
            type="date"
            required
            value={formData.end_date}
            onChange={(e) => setFormData({ ...formData, end_date: e.target.value })}
            className="w-full px-2 py-1 text-xs border border-gray-300 rounded focus:ring-primary-500 focus:border-primary-500"
          />
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-xs font-medium text-gray-700 mb-0.5">
            Ставка аренды *
          </label>
          <input
            type="text"
            required
            min="0"
            value={formData.rent_amount}
            onChange={(e) => {
              // Разрешаем только цифры и точку/запятую
              const value = e.target.value.replace(/[^\d.,]/g, '').replace(',', '.');
              setFormData({ ...formData, rent_amount: value });
            }}
            onBlur={(e) => {
              // При потере фокуса форматируем число
              const num = parseFloat(e.target.value);
              if (!isNaN(num)) {
                setFormData({ ...formData, rent_amount: num.toFixed(2) });
              }
            }}
            className="w-full px-2 py-1 text-xs border border-gray-300 rounded focus:ring-primary-500 focus:border-primary-500"
          />
        </div>
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-xs font-medium text-gray-700 mb-0.5">
            Валюта
          </label>
          <select
            value={formData.currency}
            onChange={(e) => setFormData({ ...formData, currency: e.target.value })}
            className="w-full px-2 py-1 text-xs border border-gray-300 rounded focus:ring-primary-500 focus:border-primary-500"
          >
            <option value="KGS">KGS (сомы)</option>
            <option value="USD">USD (доллары)</option>
            <option value="RUB">RUB (рубли)</option>
            <option value="EUR">EUR (евро)</option>
          </select>
        </div>
        {formData.currency !== 'KGS' && (
          <div>
            <label className="block text-xs font-medium text-gray-700 mb-0.5">
              Источник курса
            </label>
            <select
              value={formData.exchange_rate_source}
              onChange={(e) => setFormData({ ...formData, exchange_rate_source: e.target.value })}
              className="w-full px-2 py-1 text-xs border border-gray-300 rounded focus:ring-primary-500 focus:border-primary-500"
            >
              <option value="nbkr">НБКР (по умолчанию)</option>
              <option value="average">Средний курс</option>
              <option value="best">Лучший курс</option>
            </select>
          </div>
        )}
      </div>
      </div>

      <div>
        <label className="block text-xs font-medium text-gray-700 mb-0.5">
          День оплаты
        </label>
        <input
          type="number"
          min="1"
          max="31"
          value={formData.due_day}
          onChange={(e) => setFormData({ ...formData, due_day: parseInt(e.target.value) })}
          className="w-full px-2 py-1 text-xs border border-gray-300 rounded focus:ring-primary-500 focus:border-primary-500"
        />
      </div>

      <div className="space-y-3">
        <div className="flex items-center">
          <input
            type="checkbox"
            checked={formData.deposit_enabled}
            onChange={(e) => setFormData({ ...formData, deposit_enabled: e.target.checked })}
            className="h-4 w-4 text-primary-600 focus:ring-primary-500 border-gray-300 rounded"
          />
          <label className="ml-2 block text-sm text-gray-700">
            Депозит включён
          </label>
        </div>
        {formData.deposit_enabled && (
          <div>
            <label className="block text-xs font-medium text-gray-700 mb-0.5">
              Сумма депозита *
            </label>
            <input
              type="number"
              required={formData.deposit_enabled}
              min="0"
              step="0.01"
              value={formData.deposit_amount}
              onChange={(e) => setFormData({ ...formData, deposit_amount: e.target.value })}
              className="w-full px-2 py-1 text-xs border border-gray-300 rounded focus:ring-primary-500 focus:border-primary-500"
            />
          </div>
        )}
      </div>

      <div className="space-y-3">
        <div className="flex items-center">
          <input
            type="checkbox"
            checked={formData.advance_enabled}
            onChange={(e) => setFormData({ ...formData, advance_enabled: e.target.checked })}
            className="h-4 w-4 text-primary-600 focus:ring-primary-500 border-gray-300 rounded"
          />
          <label className="ml-2 block text-sm text-gray-700">
            Аванс включён
          </label>
        </div>
        {formData.advance_enabled && (
          <div>
            <label className="block text-xs font-medium text-gray-700 mb-0.5">
              Месяцев аванса
            </label>
            <input
              type="number"
              min="1"
              value={formData.advance_months}
              onChange={(e) => setFormData({ ...formData, advance_months: parseInt(e.target.value) })}
              className="w-full px-2 py-1 text-xs border border-gray-300 rounded focus:ring-primary-500 focus:border-primary-500"
            />
          </div>
        )}
      </div>

      <div>
        <label className="block text-xs font-medium text-gray-700 mb-0.5">
          Статус *
        </label>
        <select
          required
          value={formData.status}
          onChange={(e) => setFormData({ ...formData, status: e.target.value })}
          className="w-full px-2 py-1 text-xs border border-gray-300 rounded focus:ring-primary-500 focus:border-primary-500"
        >
          <option value="draft">Черновик</option>
          <option value="active">Активен</option>
          <option value="ended">Завершён</option>
          <option value="cancelled">Отменён</option>
        </select>
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
