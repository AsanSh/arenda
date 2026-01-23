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
  onSubmit: (data: any) => Promise<void>;
  loading?: boolean;
  isProlongation?: boolean;
}

interface DiscountPeriod {
  start_date: string;
  end_date: string;
  discount_percent: string;
  comment: string;
}

export default function ContractForm({ contract, onSubmit, loading = false, isProlongation = false }: ContractFormProps) {
  const [properties, setProperties] = useState<Property[]>([]);
  const [tenants, setTenants] = useState<Tenant[]>([]);
  const [discountPeriods, setDiscountPeriods] = useState<DiscountPeriod[]>([]);
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

  const addDiscountPeriod = () => {
    setDiscountPeriods([...discountPeriods, {
      start_date: formData.start_date || '',
      end_date: formData.end_date || '',
      discount_percent: '',
      comment: '',
    }]);
  };

  const removeDiscountPeriod = (index: number) => {
    setDiscountPeriods(discountPeriods.filter((_, i) => i !== index));
  };

  const updateDiscountPeriod = (index: number, field: keyof DiscountPeriod, value: string) => {
    const updated = [...discountPeriods];
    updated[index] = { ...updated[index], [field]: value };
    setDiscountPeriods(updated);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const payload = {
      ...formData,
      property: parseInt(formData.property),
      tenant: parseInt(formData.tenant),
      rent_amount: formData.rent_amount,
      deposit_amount: formData.deposit_enabled ? formData.deposit_amount : '0',
    };
    await onSubmit(payload);
  };

  return (
    <form id="contract-form" onSubmit={handleSubmit} className="space-y-6">
      {/* Общая информация */}
      <div>
        <h3 className="text-xs font-semibold text-slate-600 uppercase tracking-wide mb-4 pb-2 border-b border-slate-200">
          Общая информация
        </h3>
        <div className="space-y-4">
          <div>
            <label className="block text-xs font-medium text-slate-700 mb-1.5">
              Дата подписания *
            </label>
            <input
              type="date"
              required
              value={formData.signed_at}
              onChange={(e) => setFormData({ ...formData, signed_at: e.target.value })}
              className="w-full px-3 py-2 text-sm border border-slate-300 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-colors"
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-700 mb-1.5">
              Объект недвижимости *
            </label>
            <select
              required
              value={formData.property}
              onChange={(e) => setFormData({ ...formData, property: e.target.value })}
              className="w-full px-3 py-2 text-sm border border-slate-300 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-colors"
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
            <label className="block text-xs font-medium text-slate-700 mb-1.5">
              Арендатор *
            </label>
            <select
              required
              value={formData.tenant}
              onChange={(e) => setFormData({ ...formData, tenant: e.target.value })}
              className="w-full px-3 py-2 text-sm border border-slate-300 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-colors"
            >
              <option value="">Выберите арендатора</option>
              {tenants.map((tenant) => (
                <option key={tenant.id} value={tenant.id}>
                  {tenant.name}
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* Даты и условия аренды */}
      <div>
        <h3 className="text-xs font-semibold text-slate-600 uppercase tracking-wide mb-4 pb-2 border-b border-slate-200">
          Даты и условия аренды
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-medium text-slate-700 mb-1.5">
              Дата начала *
            </label>
            <input
              type="date"
              required
              value={formData.start_date}
              onChange={(e) => setFormData({ ...formData, start_date: e.target.value })}
              className="w-full px-3 py-2 text-sm border border-slate-300 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-colors"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-slate-700 mb-1.5">
              Дата окончания *
            </label>
            <input
              type="date"
              required
              value={formData.end_date}
              onChange={(e) => setFormData({ ...formData, end_date: e.target.value })}
              className="w-full px-3 py-2 text-sm border border-slate-300 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-colors"
            />
          </div>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
          <div>
            <label className="block text-xs font-medium text-slate-700 mb-1.5">
              День оплаты
            </label>
            <input
              type="number"
              min="1"
              max="31"
              value={formData.due_day}
              onChange={(e) => setFormData({ ...formData, due_day: parseInt(e.target.value) })}
              className="w-full px-3 py-2 text-sm border border-slate-300 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-colors"
            />
          </div>
        </div>
      </div>

      {/* Финансы */}
      <div>
        <h3 className="text-xs font-semibold text-slate-600 uppercase tracking-wide mb-4 pb-2 border-b border-slate-200">
          Финансы
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-medium text-slate-700 mb-1.5">
              Ставка аренды *
            </label>
            <input
              type="text"
              required
              value={formData.rent_amount}
              onChange={(e) => {
                const value = e.target.value.replace(/[^\d.,]/g, '').replace(',', '.');
                setFormData({ ...formData, rent_amount: value });
              }}
              onBlur={(e) => {
                const num = parseFloat(e.target.value);
                if (!isNaN(num)) {
                  setFormData({ ...formData, rent_amount: num.toFixed(2) });
                }
              }}
              className="w-full px-3 py-2 text-sm border border-slate-300 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-colors"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-slate-700 mb-1.5">
              Валюта
            </label>
            <select
              value={formData.currency}
              onChange={(e) => setFormData({ ...formData, currency: e.target.value })}
              className="w-full px-3 py-2 text-sm border border-slate-300 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-colors"
            >
              <option value="KGS">KGS (сомы)</option>
              <option value="USD">USD (доллары)</option>
              <option value="RUB">RUB (рубли)</option>
              <option value="EUR">EUR (евро)</option>
            </select>
            {formData.currency !== 'KGS' && (
              <div className="mt-3">
                <label className="block text-xs font-medium text-slate-700 mb-1.5">
                  Источник курса
                </label>
                <select
                  value={formData.exchange_rate_source}
                  onChange={(e) => setFormData({ ...formData, exchange_rate_source: e.target.value })}
                  className="w-full px-3 py-2 text-sm border border-slate-300 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-colors"
                >
                  <option value="nbkr">НБКР (по умолчанию)</option>
                  <option value="average">Средний курс</option>
                  <option value="best">Лучший курс</option>
                </select>
              </div>
            )}
          </div>
        </div>

        <div className="mt-4 space-y-3">
          <div className="flex items-start gap-3 p-4 rounded-xl border border-slate-200 bg-slate-50">
            <input
              type="checkbox"
              checked={formData.deposit_enabled}
              onChange={(e) => setFormData({ ...formData, deposit_enabled: e.target.checked })}
              className="mt-0.5 h-4 w-4 text-indigo-600 focus:ring-indigo-500 border-slate-300 rounded"
            />
            <div className="flex-1">
              <label className="block text-sm font-medium text-slate-700 cursor-pointer">
                Депозит включён
              </label>
            </div>
          </div>
          {formData.deposit_enabled && (
            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1.5">
                Сумма депозита *
              </label>
              <input
                type="number"
                required={formData.deposit_enabled}
                min="0"
                step="0.01"
                value={formData.deposit_amount}
                onChange={(e) => setFormData({ ...formData, deposit_amount: e.target.value })}
                className="w-full px-3 py-2 text-sm border border-slate-300 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-colors"
              />
            </div>
          )}
        </div>

        <div className="mt-3 space-y-3">
          <div className="flex items-start gap-3 p-4 rounded-xl border border-slate-200 bg-slate-50">
            <input
              type="checkbox"
              checked={formData.advance_enabled}
              onChange={(e) => setFormData({ ...formData, advance_enabled: e.target.checked })}
              className="mt-0.5 h-4 w-4 text-indigo-600 focus:ring-indigo-500 border-slate-300 rounded"
            />
            <div className="flex-1">
              <label className="block text-sm font-medium text-slate-700 cursor-pointer">
                Аванс включён
              </label>
            </div>
          </div>
          {formData.advance_enabled && (
            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1.5">
                Месяцев аванса
              </label>
              <input
                type="number"
                min="1"
                value={formData.advance_months}
                onChange={(e) => setFormData({ ...formData, advance_months: parseInt(e.target.value) })}
                className="w-full px-3 py-2 text-sm border border-slate-300 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-colors"
              />
            </div>
          )}
        </div>
      </div>

      {/* Статус и комментарий */}
      <div>
        <h3 className="text-xs font-semibold text-slate-600 uppercase tracking-wide mb-4 pb-2 border-b border-slate-200">
          Статус и заметки
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-medium text-slate-700 mb-1.5">
              Статус *
            </label>
            <select
              required
              value={formData.status}
              onChange={(e) => setFormData({ ...formData, status: e.target.value })}
              className="w-full px-3 py-2 text-sm border border-slate-300 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-colors"
            >
              <option value="draft">Черновик</option>
              <option value="active">Активен</option>
              <option value="ended">Завершён</option>
              <option value="cancelled">Отменён</option>
            </select>
          </div>
        </div>
        <div className="mt-4">
          <label className="block text-xs font-medium text-slate-700 mb-1.5">
            Комментарий
          </label>
          <textarea
            value={formData.comment}
            onChange={(e) => setFormData({ ...formData, comment: e.target.value })}
            rows={2}
            className="w-full px-3 py-2 text-sm border border-slate-300 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-colors"
          />
        </div>
      </div>

      {/* Дополнительные условия */}
      <div>
        <h3 className="text-xs font-semibold text-slate-600 uppercase tracking-wide mb-4 pb-2 border-b border-slate-200">
          Дополнительные условия
        </h3>
        <div className="space-y-4">
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
            <p className="text-xs text-blue-700">
              <strong>Льготные периоды:</strong> Укажите периоды с уменьшенной арендной платой (например, для ремонта, каникул и т.д.)
            </p>
          </div>
          
          {discountPeriods.map((period, index) => (
            <div key={index} className="border border-slate-200 rounded-lg p-4 bg-slate-50">
              <div className="flex justify-between items-center mb-3">
                <h4 className="text-xs font-semibold text-slate-700">Льготный период #{index + 1}</h4>
                <button
                  type="button"
                  onClick={() => removeDiscountPeriod(index)}
                  className="text-xs text-red-600 hover:text-red-800"
                >
                  Удалить
                </button>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1">
                    Дата начала льготы *
                  </label>
                  <input
                    type="date"
                    required
                    value={period.start_date}
                    onChange={(e) => updateDiscountPeriod(index, 'start_date', e.target.value)}
                    className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1">
                    Дата окончания льготы *
                  </label>
                  <input
                    type="date"
                    required
                    value={period.end_date}
                    onChange={(e) => updateDiscountPeriod(index, 'end_date', e.target.value)}
                    className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1">
                    Скидка (%)
                  </label>
                  <input
                    type="number"
                    min="0"
                    max="100"
                    step="0.01"
                    value={period.discount_percent}
                    onChange={(e) => updateDiscountPeriod(index, 'discount_percent', e.target.value)}
                    placeholder="0"
                    className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1">
                    Причина льготы
                  </label>
                  <input
                    type="text"
                    value={period.comment}
                    onChange={(e) => updateDiscountPeriod(index, 'comment', e.target.value)}
                    placeholder="Ремонт, каникулы и т.д."
                    className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                  />
                </div>
              </div>
            </div>
          ))}
          
          <button
            type="button"
            onClick={addDiscountPeriod}
            className="w-full px-4 py-2 text-sm font-medium text-indigo-600 border border-indigo-300 rounded-lg hover:bg-indigo-50 transition-colors"
          >
            + Добавить льготный период
          </button>
        </div>
      </div>
    </form>
  );
}
