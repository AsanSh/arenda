import React, { useState, useEffect } from 'react';
import client from '../api/client';

interface AccrualFormData {
  id?: number;
  contract: number;
  period_start: string;
  period_end: string;
  due_date: string;
  base_amount: string;
  adjustments: string;
  utilities_amount: string;
  utility_type: string;
  comment: string;
}

interface Contract {
  id: number;
  number: string;
  property_name: string;
  tenant_name: string;
}

interface AccrualFormProps {
  accrual: AccrualFormData | null;
  onSave: (formData?: AccrualFormData) => void;
  onCancel: () => void;
  isBulkEdit?: boolean;
  selectedCount?: number;
}

const UTILITY_TYPES = [
  { value: 'rent', label: 'Аренда' },
  { value: 'electricity', label: 'Электричество' },
  { value: 'water', label: 'Вода' },
  { value: 'gas', label: 'Газ' },
  { value: 'garbage', label: 'Мусор' },
  { value: 'service', label: 'Сервисное обслуживание' },
  { value: 'salary', label: 'Зарплата' },
  { value: 'transport', label: 'Транспортные расходы' },
  { value: 'other', label: 'Прочие расходы' },
];

export default function AccrualForm({ accrual, onSave, onCancel, isBulkEdit = false, selectedCount = 0 }: AccrualFormProps) {
  const [contracts, setContracts] = useState<Contract[]>([]);
  const [formData, setFormData] = useState<AccrualFormData>({
    contract: 0,
    period_start: new Date().toISOString().split('T')[0],
    period_end: new Date().toISOString().split('T')[0],
    due_date: new Date().toISOString().split('T')[0],
    base_amount: '0',
    adjustments: '0',
    utilities_amount: '0',
    utility_type: 'rent',
    comment: '',
  });
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    fetchContracts();
    if (accrual) {
      setFormData(accrual);
    }
  }, [accrual]);

  const fetchContracts = async () => {
    try {
      const response = await client.get('/contracts/');
      setContracts(response.data.results || response.data);
    } catch (error) {
      console.error('Error fetching contracts:', error);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      if (isBulkEdit) {
        // Массовое редактирование - передаем данные в onSave
        onSave(formData);
      } else {
        // Обычное редактирование/создание
        const payload = {
          ...formData,
          contract: formData.contract || undefined,
        };
        
        if (accrual?.id) {
          await client.patch(`/accruals/${accrual.id}/`, payload);
        } else {
          await client.post('/accruals/', payload);
        }
        onSave();
      }
    } catch (error: any) {
      console.error('Error saving accrual:', error);
      alert(error.response?.data?.error || 'Ошибка при сохранении');
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-2">
      {isBulkEdit && (
        <div className="mb-3 p-2 bg-blue-50 border border-blue-200 rounded text-xs text-blue-800">
          Массовое редактирование: выбрано начислений - {selectedCount}
        </div>
      )}
      
      {!isBulkEdit && (
        <div>
          <label className="block text-xs font-medium text-gray-700 mb-0.5">
            Договор *
          </label>
          <select
            required
            value={formData.contract}
            onChange={(e) => setFormData({ ...formData, contract: parseInt(e.target.value) })}
            className="w-full px-2 py-1 text-xs border border-gray-300 rounded focus:ring-primary-500 focus:border-primary-500"
          >
            <option value="0">Выберите договор</option>
            {contracts.map((contract) => (
              <option key={contract.id} value={contract.id}>
                {contract.number} - {contract.property_name} ({contract.tenant_name})
              </option>
            ))}
          </select>
        </div>
      )}

      <div>
        <label className="block text-xs font-medium text-gray-700 mb-0.5">
          Тип начисления *
        </label>
        <select
          required
          value={formData.utility_type}
          onChange={(e) => setFormData({ ...formData, utility_type: e.target.value })}
          className="w-full px-2 py-1 text-xs border border-gray-300 rounded focus:ring-primary-500 focus:border-primary-500"
        >
          {UTILITY_TYPES.map((type) => (
            <option key={type.value} value={type.value}>
              {type.label}
            </option>
          ))}
        </select>
      </div>

      {!isBulkEdit && (
        <div className="grid grid-cols-3 gap-4">
          <div>
            <label className="block text-xs font-medium text-gray-700 mb-0.5">
              Начало периода *
            </label>
            <input
              type="date"
              required
              value={formData.period_start}
              onChange={(e) => setFormData({ ...formData, period_start: e.target.value })}
              className="w-full px-2 py-1 text-xs border border-gray-300 rounded focus:ring-primary-500 focus:border-primary-500"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-700 mb-0.5">
              Конец периода *
            </label>
            <input
              type="date"
              required
              value={formData.period_end}
              onChange={(e) => setFormData({ ...formData, period_end: e.target.value })}
              className="w-full px-2 py-1 text-xs border border-gray-300 rounded focus:ring-primary-500 focus:border-primary-500"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-700 mb-0.5">
              Срок оплаты *
            </label>
            <input
              type="date"
              required
              value={formData.due_date}
              onChange={(e) => setFormData({ ...formData, due_date: e.target.value })}
              className="w-full px-2 py-1 text-xs border border-gray-300 rounded focus:ring-primary-500 focus:border-primary-500"
            />
          </div>
        </div>
      )}
      
      {isBulkEdit && (
        <div>
          <label className="block text-xs font-medium text-gray-700 mb-0.5">
            Срок оплаты
          </label>
          <input
            type="date"
            value={formData.due_date}
            onChange={(e) => setFormData({ ...formData, due_date: e.target.value })}
            className="w-full px-2 py-1 text-xs border border-gray-300 rounded focus:ring-primary-500 focus:border-primary-500"
          />
          <p className="mt-1 text-xs text-gray-500">Оставьте пустым, чтобы не изменять</p>
        </div>
      )}

      <div className="grid grid-cols-3 gap-4">
        <div>
          <label className="block text-xs font-medium text-gray-700 mb-0.5">
            Базовая сумма (аренда)
          </label>
          <input
            type="number"
            step="0.01"
            min="0"
            value={formData.base_amount}
            onChange={(e) => setFormData({ ...formData, base_amount: e.target.value })}
            className="w-full px-2 py-1 text-xs border border-gray-300 rounded focus:ring-primary-500 focus:border-primary-500"
          />
        </div>
        <div>
          <label className="block text-xs font-medium text-gray-700 mb-0.5">
            Коммунальные услуги
          </label>
          <input
            type="number"
            step="0.01"
            min="0"
            value={formData.utilities_amount}
            onChange={(e) => setFormData({ ...formData, utilities_amount: e.target.value })}
            className="w-full px-2 py-1 text-xs border border-gray-300 rounded focus:ring-primary-500 focus:border-primary-500"
          />
        </div>
        <div>
          <label className="block text-xs font-medium text-gray-700 mb-0.5">
            Корректировки
          </label>
          <input
            type="number"
            step="0.01"
            value={formData.adjustments}
            onChange={(e) => setFormData({ ...formData, adjustments: e.target.value })}
            className="w-full px-2 py-1 text-xs border border-gray-300 rounded focus:ring-primary-500 focus:border-primary-500"
          />
        </div>
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
