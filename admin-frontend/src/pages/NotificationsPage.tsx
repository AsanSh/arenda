import React, { useEffect, useState, useMemo, useCallback } from 'react';
import client from '../api/client';
import { formatAmount } from '../utils/currency';
import { useUser } from '../contexts/UserContext';
import { 
  Mail, 
  Phone, 
  Send, 
  MessageSquare,
  AlertCircle,
  Users,
  CheckSquare,
  Square
} from 'lucide-react';

interface NotificationSetting {
  id?: number;
  type: 'email' | 'sms';
  is_active: boolean;
  days_before_due: number;
  template: string;
}

interface Tenant {
  id: number;
  name: string;
  email: string;
  phone: string;
  type: 'tenant' | 'landlord';
}

interface OverdueTenant {
  tenant_id: number;
  tenant_name: string;
  total_overdue: string;
  oldest_overdue_days: number;
  accruals_count: number;
  accruals: Array<{
    id: number;
    contract_number: string;
    due_date: string;
    overdue_days: number;
    amount: string;
    currency: string;
  }>;
}

interface TriggerSettings {
  days_before: boolean;
  on_due_date: boolean;
  days_after_2: boolean;
  days_after_5: boolean;
  days_after_10: boolean;
}

export default function NotificationsPage() {
  const { user } = useUser();
  // Только администраторы и сотрудники могут управлять уведомлениями
  const canManageNotifications = user?.is_admin || user?.is_staff;
  
  const [settings, setSettings] = useState<NotificationSetting[]>([]);
  const [loading, setLoading] = useState(true);
  const [tenants, setTenants] = useState<Tenant[]>([]);
  const [overdueTenants, setOverdueTenants] = useState<OverdueTenant[]>([]);
  const [selectedTenants, setSelectedTenants] = useState<Set<number>>(new Set());
  const [searchQuery, setSearchQuery] = useState('');
  const [notificationType, setNotificationType] = useState<'email' | 'sms'>('email');
  const [triggerSettings, setTriggerSettings] = useState<TriggerSettings>({
    days_before: true,
    on_due_date: true,
    days_after_2: false,
    days_after_5: false,
    days_after_10: false,
  });
  const [template, setTemplate] = useState(
    'Уважаемый {{tenant_name}}!\n\nНапоминаем, что срок оплаты начисления по договору {{contract_number}} наступает {{due_date}}.\nСумма к оплате: {{amount}} {{currency}}.\n\nС уважением, Команда AMT'
  );

  useEffect(() => {
    fetchSettings();
    fetchTenants();
    fetchOverdueTenants();
  }, []);

  const fetchSettings = async () => {
    try {
      const response = await client.get('/notifications/settings/');
      const data = response.data.results || response.data || [];
      setSettings(data);
      // Set initial template if exists
      const emailSetting = data.find((s: NotificationSetting) => s.type === 'email');
      if (emailSetting) {
        setTemplate(emailSetting.template || template);
      }
    } catch (error) {
      console.error('Error fetching settings:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchTenants = async () => {
    try {
      const response = await client.get('/tenants/?page_size=1000');
      setTenants(response.data.results || response.data || []);
    } catch (error) {
      console.error('Error fetching tenants:', error);
    }
  };

  const fetchOverdueTenants = async () => {
    try {
      const response = await client.get('/reports/overdue_payments/');
      setOverdueTenants(response.data.data || []);
    } catch (error) {
      console.error('Error fetching overdue tenants:', error);
    }
  };

  const readyToSendTenants = useMemo(() => {
    return overdueTenants.map(ot => {
      const tenant = tenants.find(t => t.id === ot.tenant_id);
      return { ...ot, tenant };
    }).filter(item => item.tenant);
  }, [overdueTenants, tenants]);

  // Auto-filter recipients based on template variables
  type FilteredTenant = {
    id: number;
    name: string;
    email: string;
    phone: string;
    type: 'tenant' | 'landlord';
    isOverdue: boolean;
    overdueData: OverdueTenant | null;
  };

  const autoFilteredTenants = useMemo<FilteredTenant[]>(() => {
    // Extract variables from template
    const templateVars = template.match(/\{\{(\w+)\}\}/g) || [];
    const varNames = templateVars.map(v => v.replace(/[{}]/g, ''));
    
    // If template contains overdue-related variables, show overdue tenants first
    const hasOverdueVars = varNames.some(v => 
      ['amount', 'due_date', 'date', 'overdue_days'].includes(v)
    );
    
    if (hasOverdueVars && readyToSendTenants.length > 0) {
      return readyToSendTenants.map(item => ({
        id: item.tenant_id,
        name: item.tenant_name,
        email: item.tenant?.email || '',
        phone: item.tenant?.phone || '',
        type: (item.tenant?.type || 'tenant') as 'tenant' | 'landlord',
        isOverdue: true,
        overdueData: item,
      }));
    }
    
    return tenants.map(t => ({
      id: t.id,
      name: t.name,
      email: t.email || '',
      phone: t.phone || '',
      type: t.type,
      isOverdue: false,
      overdueData: null,
    }));
  }, [template, tenants, readyToSendTenants]);

  const filteredTenants = useMemo<FilteredTenant[]>(() => {
    const baseList = autoFilteredTenants;
    if (!searchQuery) return baseList;
    const query = searchQuery.toLowerCase();
    return baseList.filter((t: FilteredTenant) => 
      t.name.toLowerCase().includes(query) ||
      t.email?.toLowerCase().includes(query) ||
      t.phone?.toLowerCase().includes(query)
    );
  }, [autoFilteredTenants, searchQuery]);

  const handleToggleTenant = (tenantId: number) => {
    const newSet = new Set(selectedTenants);
    if (newSet.has(tenantId)) {
      newSet.delete(tenantId);
    } else {
      newSet.add(tenantId);
    }
    setSelectedTenants(newSet);
  };

  const handleSelectAllReady = () => {
    const newSet = new Set(selectedTenants);
    readyToSendTenants.forEach(item => newSet.add(item.tenant_id));
    setSelectedTenants(newSet);
  };

  const renderTemplatePreview = useCallback(() => {
    // Use first selected tenant's data if available, otherwise use sample
    const firstSelected = filteredTenants.find((t: FilteredTenant) => selectedTenants.has(t.id));
    const sampleData: Record<string, string> = {
      tenant_name: firstSelected?.name || 'Иван Иванов',
      name: firstSelected?.name || 'Иван Иванов', // Alias for {{name}}
      contract_number: firstSelected?.overdueData?.accruals[0]?.contract_number || 'Д-2024-001',
      due_date: firstSelected?.overdueData?.accruals[0]?.due_date 
        ? new Date(firstSelected.overdueData.accruals[0].due_date).toLocaleDateString('ru-RU')
        : new Date().toLocaleDateString('ru-RU'),
      date: firstSelected?.overdueData?.accruals[0]?.due_date 
        ? new Date(firstSelected.overdueData.accruals[0].due_date).toLocaleDateString('ru-RU')
        : new Date().toLocaleDateString('ru-RU'), // Alias for {{date}}
      amount: firstSelected?.overdueData?.total_overdue 
        ? formatAmount(firstSelected.overdueData.total_overdue).replace(/\s/g, '')
        : '50 000',
      currency: firstSelected?.overdueData?.accruals[0]?.currency || 'с',
      property_name: 'Офис 101',
      property_address: 'ул. Примерная, 1',
      overdue_days: firstSelected?.overdueData?.oldest_overdue_days?.toString() || '28',
    };

    let preview = template;
    Object.entries(sampleData).forEach(([key, value]) => {
      preview = preview.replace(new RegExp(`\\{\\{${key}\\}\\}`, 'g'), String(value));
    });

    return preview;
  }, [template, filteredTenants, selectedTenants]);

  const handleSaveSettings = async () => {
    try {
      const setting = settings.find(s => s.type === notificationType);
      const payload = {
        type: notificationType,
        is_active: true,
        days_before_due: 3,
        template: template,
      };

      if (setting?.id) {
        await client.patch(`/notifications/settings/${setting.id}/`, payload);
      } else {
        await client.post('/notifications/settings/', payload);
      }
      await fetchSettings();
      alert('Настройки сохранены');
    } catch (error) {
      console.error('Error saving settings:', error);
      alert('Ошибка при сохранении настроек');
    }
  };

  const handleSendBulk = async () => {
    if (selectedTenants.size === 0) {
      alert('Выберите хотя бы одного контрагента');
      return;
    }

    if (!window.confirm(`Отправить уведомления ${selectedTenants.size} контрагентам?`)) {
      return;
    }

    try {
      // Here you would implement bulk sending logic
      alert(`Уведомления отправлены ${selectedTenants.size} контрагентам`);
      setSelectedTenants(new Set());
    } catch (error) {
      console.error('Error sending bulk notifications:', error);
      alert('Ошибка при отправке уведомлений');
    }
  };

  if (loading) {
    return <div className="text-center py-8">Загрузка...</div>;
  }

  // Если пользователь не имеет прав на управление уведомлениями, показываем сообщение
  if (!canManageNotifications) {
    return (
      <div className="flex flex-col items-center justify-center py-12">
        <AlertCircle className="w-16 h-16 text-red-600 mb-4" />
        <p className="text-lg font-semibold text-red-600 mb-2">Доступ запрещен</p>
        <p className="text-sm text-slate-600">Управление уведомлениями доступно только администраторам и сотрудникам.</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-slate-900">Рассылки</h1>
      </div>

      {/* Split Screen Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Left Panel: Recipients List */}
        <div className="space-y-6">
          {/* Scenario 1: Overdue (Top Priority) */}
          <div className="bg-white rounded-card shadow-medium border border-slate-200 p-6">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <AlertCircle className="h-5 w-5 text-red-600" />
                <h2 className="text-lg font-semibold text-slate-900">Сценарий 1: Просроченные платежи</h2>
              </div>
              {readyToSendTenants.length > 0 && (
                <button
                  onClick={handleSelectAllReady}
                  className="text-sm text-indigo-600 hover:text-indigo-700 font-medium"
                >
                  Выбрать все
                </button>
              )}
            </div>
            {readyToSendTenants.length === 0 ? (
              <div className="text-sm text-slate-500 py-4 text-center">
                Нет контрагентов с просроченными платежами
              </div>
            ) : (
              <div className="space-y-1.5 max-h-96 overflow-y-auto">
                {readyToSendTenants.map((item) => (
                  <div
                    key={item.tenant_id}
                    className={`p-3 rounded-card border transition-all cursor-pointer ${
                      selectedTenants.has(item.tenant_id)
                        ? 'border-primary-500 bg-primary-50'
                        : 'border-slate-200 hover:border-slate-300'
                    }`}
                    onClick={() => handleToggleTenant(item.tenant_id)}
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          {selectedTenants.has(item.tenant_id) ? (
                            <CheckSquare 
                              className="h-5 w-5 text-indigo-600 cursor-pointer" 
                              onClick={() => handleToggleTenant(item.tenant_id)}
                            />
                          ) : (
                            <Square 
                              className="h-5 w-5 text-slate-400 cursor-pointer hover:text-indigo-600" 
                              onClick={() => handleToggleTenant(item.tenant_id)}
                            />
                          )}
                          <h3 className="font-medium text-slate-900">{item.tenant_name}</h3>
                        </div>
                        <div className="text-sm text-slate-600 ml-7">
                          Просрочено: {formatAmount(item.total_overdue)} с · {item.accruals_count} начислений
                        </div>
                        <div className="text-xs text-red-600 ml-7 mt-1 font-medium">
                          {item.oldest_overdue_days} дней просрочки
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Scenario 2: General */}
          <div className="bg-white rounded-card shadow-medium border border-slate-200 p-6">
            <div className="flex items-center gap-2 mb-4">
              <Users className="h-5 w-5 text-slate-600" />
              <h2 className="text-lg font-semibold text-slate-900">Сценарий 2: Общая рассылка</h2>
            </div>
            <div className="mb-4">
              <input
                type="text"
                placeholder="Поиск по имени, email или телефону..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full px-4 py-2.5 text-sm border border-slate-300 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
              />
            </div>
            <div className="space-y-1.5 max-h-96 overflow-y-auto">
              {filteredTenants.map((tenant: FilteredTenant) => (
                <div
                  key={tenant.id}
                  className={`p-3 rounded-card border transition-all cursor-pointer ${
                    selectedTenants.has(tenant.id)
                      ? 'border-primary-500 bg-primary-50'
                      : 'border-slate-200 hover:border-slate-300'
                  }`}
                  onClick={() => handleToggleTenant(tenant.id)}
                >
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        {selectedTenants.has(tenant.id) ? (
                          <CheckSquare 
                            className="h-5 w-5 text-indigo-600 cursor-pointer" 
                            onClick={() => handleToggleTenant(tenant.id)}
                          />
                        ) : (
                          <Square 
                            className="h-5 w-5 text-slate-400 cursor-pointer hover:text-indigo-600" 
                            onClick={() => handleToggleTenant(tenant.id)}
                          />
                        )}
                        <h3 className="font-medium text-slate-900">{tenant.name}</h3>
                      </div>
                      <div className="text-sm text-slate-600 ml-7 space-y-1">
                        {tenant.email && (
                          <div className="flex items-center gap-1.5">
                            <Mail className="w-4 h-4" />
                            {tenant.email}
                          </div>
                        )}
                        {tenant.phone && (
                          <div className="flex items-center gap-1.5">
                            <Phone className="w-4 h-4" />
                            {tenant.phone}
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Right Panel: Settings & Preview */}
        <div className="space-y-6">
          {/* Trigger Panel */}
          <div className="bg-white rounded-card shadow-medium border border-slate-200 p-6">
            <h2 className="text-lg font-semibold text-slate-900 mb-4">Настройки триггеров</h2>
            <div className="space-y-3">
              {[
                { key: 'days_before', label: 'За 3 дня до срока оплаты' },
                { key: 'on_due_date', label: 'В день срока оплаты' },
                { key: 'days_after_2', label: 'Через 2 дня после просрочки' },
                { key: 'days_after_5', label: 'Через 5 дней после просрочки' },
                { key: 'days_after_10', label: 'Через 10 дней после просрочки' },
              ].map((trigger) => (
                <label
                  key={trigger.key}
                  className="flex items-center justify-between p-3 rounded-xl border border-slate-200 hover:bg-slate-50 cursor-pointer"
                >
                  <span className="text-sm text-slate-700">{trigger.label}</span>
                  <input
                    type="checkbox"
                    checked={triggerSettings[trigger.key as keyof TriggerSettings]}
                    onChange={(e) =>
                      setTriggerSettings({
                        ...triggerSettings,
                        [trigger.key]: e.target.checked,
                      })
                    }
                    className="rounded border-slate-300 text-primary-600 focus:ring-primary-500"
                  />
                </label>
              ))}
            </div>
          </div>

          {/* Notification Type Selector */}
          <div className="bg-white rounded-card shadow-medium border border-slate-200 p-6">
            <h2 className="text-lg font-semibold text-slate-900 mb-4">Способ доставки</h2>
            <div className="grid grid-cols-2 gap-3">
              <button
                onClick={() => setNotificationType('email')}
                className={`p-4 rounded-card border-2 transition-all ${
                  notificationType === 'email'
                    ? 'border-indigo-500 bg-indigo-50'
                    : 'border-slate-200 hover:border-slate-300'
                }`}
              >
                <Mail className="w-6 h-6 mx-auto mb-2 text-slate-600" />
                <div className="text-sm font-medium text-slate-900">Email</div>
              </button>
              <button
                onClick={() => setNotificationType('sms')}
                className={`p-4 rounded-card border-2 transition-all ${
                  notificationType === 'sms'
                    ? 'border-indigo-500 bg-indigo-50'
                    : 'border-slate-200 hover:border-slate-300'
                }`}
              >
                <Phone className="w-6 h-6 mx-auto mb-2 text-slate-600" />
                <div className="text-sm font-medium text-slate-900">SMS</div>
              </button>
            </div>
          </div>

          {/* Template Editor */}
          <div className="bg-white rounded-card shadow-medium border border-slate-200 p-6">
            <h2 className="text-lg font-semibold text-slate-900 mb-4">Редактор шаблона</h2>
            <div className="mb-3">
              <label className="block text-xs font-medium text-slate-700 mb-2">
                Доступные переменные:
              </label>
              <div className="flex flex-wrap gap-2">
                {['name', 'tenant_name', 'contract_number', 'due_date', 'date', 'amount', 'currency', 'property_name', 'property_address', 'overdue_days'].map((varName) => (
                  <button
                    key={varName}
                    onClick={() => {
                      const textarea = document.getElementById('template-editor') as HTMLTextAreaElement;
                      if (textarea) {
                        const start = textarea.selectionStart;
                        const end = textarea.selectionEnd;
                        const newText = template.substring(0, start) + `{{${varName}}}` + template.substring(end);
                        setTemplate(newText);
                        setTimeout(() => {
                          textarea.focus();
                          textarea.setSelectionRange(start + varName.length + 4, start + varName.length + 4);
                        }, 0);
                      }
                    }}
                    className="px-2 py-1 text-xs bg-slate-100 text-slate-700 rounded-card hover:bg-slate-200 transition-colors"
                  >
                    {`{{${varName}}}`}
                  </button>
                ))}
              </div>
            </div>
            <textarea
              id="template-editor"
              rows={8}
              value={template}
              onChange={(e) => setTemplate(e.target.value)}
              className="w-full px-4 py-3 text-sm border border-slate-300 rounded-card focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 font-mono"
            />
          </div>

          {/* Preview */}
          <div className="bg-white rounded-card shadow-medium border border-slate-200 p-6">
            <h2 className="text-lg font-semibold text-slate-900 mb-4 flex items-center gap-2">
              <MessageSquare className="w-5 h-5" />
              Предпросмотр
            </h2>
            <div className="bg-slate-50 rounded-card p-4 border border-slate-200">
              <div className="whitespace-pre-wrap text-sm text-slate-700 font-sans">
                {renderTemplatePreview()}
              </div>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="space-y-3">
            <button
              onClick={handleSaveSettings}
              className="w-full px-4 py-3 bg-indigo-600 text-white rounded-card font-medium hover:bg-indigo-700 transition-colors shadow-sm"
            >
              Сохранить настройки
            </button>
            <button
              onClick={handleSendBulk}
              disabled={selectedTenants.size === 0}
              className="w-full px-4 py-3 bg-green-600 text-white rounded-card font-medium hover:bg-green-700 transition-colors shadow-sm disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            >
              <Send className="w-5 h-5" />
              Отправить выбранным ({selectedTenants.size})
            </button>
            {notificationType === 'sms' && (
              <button
                className="w-full px-4 py-3 bg-green-500 text-white rounded-xl font-medium hover:bg-green-600 transition-colors shadow-sm flex items-center justify-center gap-2 min-h-[44px]"
              >
                <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M17.472 14.382c-.297-.149-1.758-1.123-2.01-1.25-.252-.128-.436-.192-.619.192-.183.384-.71 1.25-.87 1.507-.16.256-.32.288-.593.096-.273-.192-1.15-.424-2.19-1.352-.81-.723-1.357-1.615-1.515-1.888-.16-.273-.016-.42.115-.545.128-.128.273-.32.41-.512.136-.192.182-.32.273-.544.09-.224.045-.384-.023-.545-.068-.16-.61-1.47-.836-2.014-.22-.545-.44-.47-.61-.48-.17-.01-.365-.01-.56-.01-.192 0-.503.06-.767.3-.264.24-1.01.99-1.01 2.41 0 1.42 1.03 2.8 1.18 2.99.15.19 2.08 3.16 5.04 4.42.71.3 1.27.48 1.7.61.71.21 1.36.18 1.87.11.54-.07 1.66-.68 1.9-1.33.24-.66.24-1.22.17-1.33-.07-.11-.27-.18-.57-.29z"/>
                </svg>
                Отправить через WhatsApp
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
