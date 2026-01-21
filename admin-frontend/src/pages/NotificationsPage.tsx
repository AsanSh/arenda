import React, { useEffect, useState } from 'react';
import client from '../api/client';

interface NotificationSettings {
  notification_type: 'email' | 'sms';
  days_before: number;
  message_template: string;
  is_enabled: boolean;
}

interface Tenant {
  id: number;
  name: string;
}

interface NotificationLog {
  id: number;
  tenant_detail?: { name: string };
  accrual_detail?: {
    contract_number?: string;
    property_name?: string;
    balance?: string;
    currency?: string;
    due_date?: string;
  };
  notification_type: string;
  recipient: string;
  status: string;
  sent_at: string;
  error_message?: string;
}

export default function NotificationsPage() {
  const [settings, setSettings] = useState<NotificationSettings>({
    notification_type: 'email',
    days_before: 3,
    message_template:
      'Уважаемый {tenant_name}!\n\nНапоминаем, что срок оплаты начисления по договору {contract_number} наступает {due_date}.\nСумма к оплате: {amount} {currency}.\n\nС уважением, Команда ZAKUP.ONE',
    is_enabled: true,
  });
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [tenants, setTenants] = useState<Tenant[]>([]);
  const [selectedTenant, setSelectedTenant] = useState<number | null>(null);
  const [testStatus, setTestStatus] = useState<string | null>(null);
  const [logs, setLogs] = useState<NotificationLog[]>([]);
  const [logsLoading, setLogsLoading] = useState(false);

  useEffect(() => {
    fetchSettings();
    fetchTenants();
    fetchLogs();
  }, []);

  const fetchSettings = async () => {
    try {
      setLoading(true);
      const res = await client.get('/notifications/settings/');
      setSettings(res.data);
    } catch (error) {
      console.error('Error loading notification settings:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchTenants = async () => {
    try {
      const res = await client.get('/tenants/?page_size=1000');
      setTenants(res.data.results || res.data || []);
    } catch (error) {
      console.error('Error loading tenants:', error);
    }
  };

  const fetchLogs = async () => {
    try {
      setLogsLoading(true);
      const res = await client.get('/notifications/logs/?page_size=20');
      setLogs(res.data.results || res.data || []);
    } catch (error) {
      console.error('Error loading notification logs:', error);
    } finally {
      setLogsLoading(false);
    }
  };

  const saveSettings = async () => {
    try {
      setSaving(true);
      await client.post('/notifications/settings/', settings);
      await fetchSettings();
    } catch (error) {
      console.error('Error saving settings:', error);
      alert('Не удалось сохранить настройки');
    } finally {
      setSaving(false);
    }
  };

  const sendTest = async () => {
    if (!selectedTenant) {
      setTestStatus('Выберите контрагента для теста');
      return;
    }
    try {
      setTestStatus('Отправляем...');
      const res = await client.post('/notifications/settings/send_test/', {
        tenant_id: selectedTenant,
      });
      setTestStatus(res.data?.status || 'Тестовое уведомление отправлено');
      fetchLogs();
    } catch (error: any) {
      console.error('Error sending test notification:', error);
      const msg = error?.response?.data?.error || 'Не удалось отправить тестовое уведомление';
      setTestStatus(msg);
    }
  };

  const sendAll = async () => {
    try {
      setTestStatus('Запуск массовой рассылки...');
      const res = await client.post('/notifications/settings/send_all/');
      setTestStatus(res.data?.status || 'Рассылка запущена');
      fetchLogs();
    } catch (error) {
      console.error('Error sending all notifications:', error);
      setTestStatus('Не удалось выполнить рассылку');
    }
  };

  const templateVariables = [
    '{tenant_name}',
    '{contract_number}',
    '{due_date}',
    '{amount}',
    '{currency}',
    '{property_name}',
    '{property_address}',
  ];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900">Рассылки</h1>
      </div>

      <div className="bg-white rounded-lg shadow p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold text-gray-900">Настройки уведомлений</h2>
          <label className="inline-flex items-center space-x-2 text-sm">
            <input
              type="checkbox"
              className="h-4 w-4 text-primary-600 border-gray-300 rounded"
              checked={settings.is_enabled}
              onChange={(e) => setSettings({ ...settings, is_enabled: e.target.checked })}
            />
            <span>Включить рассылку</span>
          </label>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">Способ доставки</label>
            <div className="flex space-x-3">
              {[
                { value: 'email', label: 'Email' },
                { value: 'sms', label: 'Телефон (SMS)' },
              ].map((item) => (
                <label key={item.value} className="inline-flex items-center space-x-2 text-sm">
                  <input
                    type="radio"
                    name="notification_type"
                    value={item.value}
                    checked={settings.notification_type === item.value}
                    onChange={() => setSettings({ ...settings, notification_type: item.value as 'email' | 'sms' })}
                    className="h-4 w-4 text-primary-600 border-gray-300"
                  />
                  <span>{item.label}</span>
                </label>
              ))}
            </div>
          </div>

          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">За сколько дней до срока</label>
            <input
              type="number"
              min={0}
              value={settings.days_before}
              onChange={(e) => setSettings({ ...settings, days_before: parseInt(e.target.value || '0', 10) })}
              className="w-full px-3 py-2 text-sm border border-gray-300 rounded focus:ring-primary-500 focus:border-primary-500"
            />
          </div>

          <div className="md:col-span-2">
            <label className="block text-xs font-medium text-gray-700 mb-1">Шаблон сообщения</label>
            <textarea
              rows={6}
              value={settings.message_template}
              onChange={(e) => setSettings({ ...settings, message_template: e.target.value })}
              className="w-full px-3 py-2 text-sm border border-gray-300 rounded focus:ring-primary-500 focus:border-primary-500"
            />
            <p className="text-xs text-gray-500 mt-1">
              Доступные переменные: {templateVariables.join(', ')}
            </p>
          </div>
        </div>

        <div className="mt-4 flex flex-wrap gap-2">
          <button
            onClick={saveSettings}
            disabled={saving || loading}
            className="px-4 py-2 bg-primary-600 text-white text-sm rounded hover:bg-primary-700 disabled:opacity-50"
          >
            {saving ? 'Сохранение...' : 'Сохранить настройки'}
          </button>
          <button
            onClick={sendAll}
            className="px-4 py-2 bg-gray-100 text-sm rounded hover:bg-gray-200"
          >
            Запустить рассылку сейчас
          </button>
          {testStatus && <span className="text-sm text-gray-600">{testStatus}</span>}
        </div>
      </div>

      <div className="bg-white rounded-lg shadow p-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">Тестовое уведомление</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 items-end">
          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">Контрагент</label>
            <select
              value={selectedTenant || ''}
              onChange={(e) => setSelectedTenant(e.target.value ? parseInt(e.target.value, 10) : null)}
              className="w-full px-3 py-2 text-sm border border-gray-300 rounded focus:ring-primary-500 focus:border-primary-500"
            >
              <option value="">Выберите контрагента</option>
              {tenants.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.name}
                </option>
              ))}
            </select>
          </div>
          <div>
            <button
              onClick={sendTest}
              className="px-4 py-2 bg-primary-600 text-white text-sm rounded hover:bg-primary-700"
            >
              Отправить тест
            </button>
          </div>
        </div>
      </div>

      <div className="bg-white rounded-lg shadow p-6">
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-lg font-semibold text-gray-900">Логи уведомлений</h2>
          <button
            onClick={fetchLogs}
            className="px-3 py-1.5 text-xs bg-gray-100 rounded hover:bg-gray-200"
          >
            Обновить
          </button>
        </div>
        {logsLoading ? (
          <div className="text-sm text-gray-500">Загрузка...</div>
        ) : logs.length === 0 ? (
          <div className="text-sm text-gray-500">Логов пока нет</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-3 py-2 text-left text-xs font-medium text-gray-500">Дата</th>
                  <th className="px-3 py-2 text-left text-xs font-medium text-gray-500">Контрагент</th>
                  <th className="px-3 py-2 text-left text-xs font-medium text-gray-500">Начисление</th>
                  <th className="px-3 py-2 text-left text-xs font-medium text-gray-500">Кому</th>
                  <th className="px-3 py-2 text-left text-xs font-medium text-gray-500">Тип</th>
                  <th className="px-3 py-2 text-left text-xs font-medium text-gray-500">Статус</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {logs.map((log) => (
                  <tr key={log.id}>
                    <td className="px-3 py-2 text-sm text-gray-500">
                      {log.sent_at ? new Date(log.sent_at).toLocaleString('ru-RU') : '-'}
                    </td>
                    <td className="px-3 py-2 text-sm text-gray-900">{log.tenant_detail?.name || '-'}</td>
                    <td className="px-3 py-2 text-sm text-gray-600">
                      {log.accrual_detail?.contract_number || '-'}
                    </td>
                    <td className="px-3 py-2 text-sm text-gray-600">{log.recipient}</td>
                    <td className="px-3 py-2 text-sm text-gray-600">{log.notification_type}</td>
                    <td className="px-3 py-2 text-sm">
                      {log.status === 'sent' && <span className="text-green-600">Отправлено</span>}
                      {log.status === 'failed' && (
                        <span className="text-red-600">Ошибка {log.error_message ? `(${log.error_message})` : ''}</span>
                      )}
                      {log.status === 'skipped' && <span className="text-gray-500">Пропущено</span>}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
