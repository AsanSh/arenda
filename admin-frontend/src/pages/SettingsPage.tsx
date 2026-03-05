import React, { useState, useEffect } from 'react';
import { useDensity } from '../contexts/DensityContext';
import { useUser } from '../contexts/UserContext';
import { UserIcon, PaintBrushIcon, BellIcon, UserGroupIcon, DocumentTextIcon } from '@heroicons/react/24/outline';
import { MessageCircle } from 'lucide-react';
import client from '../api/client';
import EmployeeForm, { type Employee } from '../components/EmployeeForm';
import Drawer from '../components/Drawer';

type TabType = 'profile' | 'interface' | 'notifications' | 'employees' | 'logs';

interface ProfileData {
  username: string;
  email: string;
  phone: string;
}

interface NotificationSettings {
  email: boolean;
  sms: boolean;
  whatsapp: boolean;
}

interface AuditLogEntry {
  id: number;
  user: number | null;
  user_name: string | null;
  action: string;
  action_display: string;
  target_model: string;
  target_id: string | null;
  target_repr: string;
  old_data: Record<string, unknown>;
  new_data: Record<string, unknown>;
  reason: string;
  created_at: string;
}

export default function SettingsPage() {
  const [activeTab, setActiveTab] = useState<TabType>('profile');
  const { isCompact, toggleCompact } = useDensity();
  const { user } = useUser();
  
  // Профиль - автоматически заполняем из UserContext
  const [profile, setProfile] = useState<ProfileData>(() => {
    const saved = localStorage.getItem('user_profile');
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        // Если есть телефон из UserContext, используем его
        const phoneFromContext = localStorage.getItem('whatsapp_phone') || user?.phone || '';
        return {
          username: parsed.username || user?.username || '',
          email: parsed.email || user?.email || '',
          phone: parsed.phone || phoneFromContext || '',
        };
      } catch {
        const phoneFromContext = localStorage.getItem('whatsapp_phone') || user?.phone || '';
        return {
          username: user?.username || '',
          email: user?.email || '',
          phone: phoneFromContext,
        };
      }
    }
    const phoneFromContext = localStorage.getItem('whatsapp_phone') || user?.phone || '';
    return {
      username: user?.username || '',
      email: user?.email || '',
      phone: phoneFromContext,
    };
  });
  const [profileLoading, setProfileLoading] = useState(false);
  
  // Обновляем профиль при изменении user из контекста
  useEffect(() => {
    if (user) {
      const phoneFromContext = localStorage.getItem('whatsapp_phone') || user.phone || '';
      setProfile(prev => ({
        username: prev.username || user.username || '',
        email: prev.email || user.email || '',
        phone: prev.phone || phoneFromContext,
      }));
    }
  }, [user]);
  
  // Уведомления
  const [notifications, setNotifications] = useState<NotificationSettings>(() => {
    const saved = localStorage.getItem('notification_settings');
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch {
        return { email: true, sms: false, whatsapp: false };
      }
    }
    return { email: true, sms: false, whatsapp: false };
  });

  const tabs = [
    { id: 'profile' as TabType, label: 'Профиль', icon: UserIcon },
    { id: 'employees' as TabType, label: 'Сотрудники', icon: UserGroupIcon },
    { id: 'interface' as TabType, label: 'Интерфейс', icon: PaintBrushIcon },
    { id: 'notifications' as TabType, label: 'Уведомления', icon: BellIcon },
    { id: 'logs' as TabType, label: 'Логи изменений', icon: DocumentTextIcon },
  ];

  // Сотрудники (Настройки → Сотрудники)
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [employeesLoading, setEmployeesLoading] = useState(false);
  const [employeesDrawerOpen, setEmployeesDrawerOpen] = useState(false);
  const [editingEmployee, setEditingEmployee] = useState<Employee | null>(null);
  const [employeeFormLoading, setEmployeeFormLoading] = useState(false);

  const fetchEmployees = async () => {
    setEmployeesLoading(true);
    try {
      const res = await client.get('/settings/employees/');
      setEmployees(res.data.results ?? res.data);
    } catch (e) {
      console.error('Failed to fetch employees', e);
      setEmployees([]);
    } finally {
      setEmployeesLoading(false);
    }
  };

  useEffect(() => {
    if (activeTab === 'employees') fetchEmployees();
  }, [activeTab]);

  // Логи изменений (Настройки → Логи)
  const [auditLogs, setAuditLogs] = useState<AuditLogEntry[]>([]);
  const [auditLogsLoading, setAuditLogsLoading] = useState(false);
  const [auditRestoringId, setAuditRestoringId] = useState<number | null>(null);

  const fetchAuditLogs = async () => {
    setAuditLogsLoading(true);
    try {
      const res = await client.get('/settings/audit-logs/');
      setAuditLogs(res.data.results ?? res.data);
    } catch (e) {
      console.error('Failed to fetch audit logs', e);
      setAuditLogs([]);
    } finally {
      setAuditLogsLoading(false);
    }
  };

  useEffect(() => {
    if (activeTab === 'logs') fetchAuditLogs();
  }, [activeTab]);

  const handleRestoreAudit = async (id: number) => {
    if (!window.confirm('Восстановить состояние по этой записи?')) return;
    setAuditRestoringId(id);
    try {
      await client.post(`/settings/audit-logs/${id}/restore/`);
      alert('Восстановлено.');
      await fetchAuditLogs();
      if (activeTab === 'profile') {
        window.location.reload();
      }
    } catch (err: any) {
      const msg = err.response?.data?.error ?? 'Не удалось восстановить';
      alert(msg);
    } finally {
      setAuditRestoringId(null);
    }
  };

  const handleSaveEmployee = async (data: Employee) => {
    setEmployeeFormLoading(true);
    try {
      if (editingEmployee?.id) {
        await client.patch(`/settings/employees/${editingEmployee.id}/`, data);
      } else {
        await client.post('/settings/employees/', data);
      }
      setEmployeesDrawerOpen(false);
      setEditingEmployee(null);
      await fetchEmployees();
    } catch (err: any) {
      const msg = err.response?.data?.phone?.[0] ?? err.response?.data?.detail ?? 'Ошибка сохранения';
      alert(typeof msg === 'string' ? msg : JSON.stringify(msg));
    } finally {
      setEmployeeFormLoading(false);
    }
  };

  const handleDeleteEmployee = async (id: number) => {
    if (!window.confirm('Удалить сотрудника?')) return;
    try {
      await client.delete(`/settings/employees/${id}/`);
      await fetchEmployees();
    } catch (err: any) {
      alert(err.response?.data?.detail ?? 'Не удалось удалить');
    }
  };

  // Сохранение профиля на сервере (логин, email, телефон)
  const handleSaveProfile = async () => {
    setProfileLoading(true);
    try {
      await client.patch('/auth/profile/', {
        username: profile.username,
        email: profile.email,
        phone: profile.phone,
        first_name: profile.username.split(' ')[0] || '',
        last_name: profile.username.split(' ').slice(1).join(' ') || '',
      });
      localStorage.setItem('user_profile', JSON.stringify(profile));
      if (profile.username) localStorage.setItem('user_name', profile.username);
      alert('Профиль сохранён');
    } catch (err: any) {
      const msg = err.response?.data?.error ?? 'Ошибка сохранения';
      alert(msg);
    } finally {
      setProfileLoading(false);
    }
  };

  // Смена пароля
  const [passwordForm, setPasswordForm] = useState({ current_password: '', new_password: '', confirm: '' });
  const [passwordLoading, setPasswordLoading] = useState(false);
  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (passwordForm.new_password !== passwordForm.confirm) {
      alert('Новый пароль и подтверждение не совпадают');
      return;
    }
    if (passwordForm.new_password.length < 6) {
      alert('Пароль не менее 6 символов');
      return;
    }
    setPasswordLoading(true);
    try {
      await client.post('/auth/change-password/', {
        current_password: passwordForm.current_password,
        new_password: passwordForm.new_password,
      });
      setPasswordForm({ current_password: '', new_password: '', confirm: '' });
      alert('Пароль изменён. При следующем входе используйте новый пароль.');
    } catch (err: any) {
      alert(err.response?.data?.error ?? 'Ошибка смены пароля');
    } finally {
      setPasswordLoading(false);
    }
  };

  // Сохранение настроек уведомлений
  const handleNotificationChange = (type: keyof NotificationSettings) => {
    const newNotifications = {
      ...notifications,
      [type]: !notifications[type],
    };
    setNotifications(newNotifications);
    localStorage.setItem('notification_settings', JSON.stringify(newNotifications));
  };

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-xl md:text-2xl font-bold text-slate-900">Настройки</h1>
        <p className="mt-1 text-xs md:text-sm text-slate-500">Управление настройками приложения</p>
      </div>

      <div className="flex flex-col md:flex-row gap-4">
        {/* Vertical Tabs */}
        <div className="w-full md:w-48 flex-shrink-0">
          <nav className="space-y-1">
            {tabs.map((tab) => {
              const Icon = tab.icon;
              const isActive = activeTab === tab.id;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`w-full flex items-center gap-2 px-3 py-2 text-sm font-medium rounded-lg transition-colors ${
                    isActive
                      ? 'bg-indigo-50 text-indigo-700 border border-indigo-200'
                      : 'text-slate-700 hover:bg-slate-50'
                  }`}
                >
                  <Icon className="h-4 w-4" />
                  {tab.label}
                </button>
              );
            })}
          </nav>
        </div>

        {/* Content */}
        <div className="flex-1 bg-white rounded-card shadow-medium border border-slate-200 p-4 md:p-6">
          {activeTab === 'profile' && (
            <div className="space-y-4">
              <h2 className="text-lg font-semibold text-slate-900">Профиль</h2>
              <div className="space-y-3">
                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1">
                    Имя пользователя
                  </label>
                  <input
                    type="text"
                    value={profile.username}
                    onChange={(e) => setProfile({ ...profile, username: e.target.value })}
                    className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                    placeholder="Введите имя"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1">
                    Email
                  </label>
                  <input
                    type="email"
                    value={profile.email}
                    onChange={(e) => setProfile({ ...profile, email: e.target.value })}
                    className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                    placeholder="email@example.com"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1">
                    Телефон
                  </label>
                  <input
                    type="tel"
                    value={profile.phone}
                    onChange={(e) => setProfile({ ...profile, phone: e.target.value })}
                    className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                    placeholder="+996 XXX XXX XXX"
                  />
                </div>
                <button 
                  onClick={handleSaveProfile}
                  disabled={profileLoading}
                  className="px-4 py-2 text-sm font-medium text-white bg-indigo-600 rounded-lg hover:bg-indigo-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {profileLoading ? 'Сохранение...' : 'Сохранить изменения'}
                </button>
              </div>
              <div className="mt-8 pt-6 border-t border-slate-200">
                <h3 className="text-base font-semibold text-slate-900 mb-3">Сменить пароль</h3>
                <p className="text-xs text-slate-500 mb-3">После смены пароля можно входить по логину и паролю (в т.ч. если первый вход был через WhatsApp).</p>
                <p className="text-xs text-amber-700 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2 mb-3 max-w-sm">Если вы вошли через WhatsApp и пароль не задавали — оставьте поле «Текущий пароль» пустым.</p>
                <form onSubmit={handleChangePassword} className="space-y-3 max-w-sm">
                  <input
                    type="password"
                    value={passwordForm.current_password}
                    onChange={(e) => setPasswordForm({ ...passwordForm, current_password: e.target.value })}
                    placeholder="Текущий пароль (оставьте пустым, если входили через WhatsApp)"
                    className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
                  />
                  <input
                    type="password"
                    value={passwordForm.new_password}
                    onChange={(e) => setPasswordForm({ ...passwordForm, new_password: e.target.value })}
                    placeholder="Новый пароль (не менее 6 символов)"
                    className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
                  />
                  <input
                    type="password"
                    value={passwordForm.confirm}
                    onChange={(e) => setPasswordForm({ ...passwordForm, confirm: e.target.value })}
                    placeholder="Повторите новый пароль"
                    className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
                  />
                  <button type="submit" disabled={passwordLoading} className="px-4 py-2 text-sm font-medium text-white bg-slate-600 rounded-lg hover:bg-slate-700 disabled:opacity-50">
                    {passwordLoading ? 'Сохранение...' : 'Сменить пароль'}
                  </button>
                </form>
              </div>
            </div>
          )}

          {activeTab === 'employees' && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-lg font-semibold text-slate-900">Сотрудники</h2>
                  <p className="text-xs text-slate-500 mt-0.5">Телефон сотрудника используется для входа по WhatsApp OTP. Типы: Администратор, Сотрудник, Мастер, Бухгалтерия, Продажи.</p>
                </div>
                <button
                  type="button"
                  onClick={() => { setEditingEmployee(null); setEmployeesDrawerOpen(true); }}
                  className="px-3 py-2 text-sm font-medium text-white bg-indigo-600 rounded-lg hover:bg-indigo-700"
                >
                  Добавить сотрудника
                </button>
              </div>
              {employeesLoading ? (
                <p className="text-sm text-slate-500">Загрузка...</p>
              ) : (
                <div className="overflow-x-auto no-scrollbar w-full border border-slate-200 rounded-lg">
                  <table className="min-w-full text-sm">
                    <thead className="bg-slate-50">
                      <tr>
                        <th className="px-3 py-2 text-left font-medium text-slate-700">Имя</th>
                        <th className="px-3 py-2 text-left font-medium text-slate-700">Тип</th>
                        <th className="px-3 py-2 text-left font-medium text-slate-700">Телефон</th>
                        <th className="px-3 py-2 text-left font-medium text-slate-700">Email</th>
                        <th className="px-3 py-2 text-right font-medium text-slate-700">Действия</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {employees.length === 0 ? (
                        <tr><td colSpan={5} className="px-3 py-6 text-center text-slate-500">Нет сотрудников. Добавьте в Настройки → Сотрудники.</td></tr>
                      ) : (
                        employees.map((emp) => (
                          <tr key={emp.id} className="hover:bg-slate-50">
                            <td className="px-3 py-2 font-medium text-slate-900">{emp.name}</td>
                            <td className="px-3 py-2 text-slate-600">{emp.type_display ?? emp.type}</td>
                            <td className="px-3 py-2 text-slate-600">{emp.phone || '—'}</td>
                            <td className="px-3 py-2 text-slate-600">{emp.email || '—'}</td>
                            <td className="px-3 py-2 text-right">
                              <button type="button" onClick={() => { setEditingEmployee(emp); setEmployeesDrawerOpen(true); }} className="text-indigo-600 hover:text-indigo-700 mr-2">Изменить</button>
                              {emp.type !== 'admin' && (
                                <button type="button" onClick={() => emp.id && handleDeleteEmployee(emp.id)} className="text-red-600 hover:text-red-700">Удалить</button>
                              )}
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}

          {activeTab === 'interface' && (
            <div className="space-y-4">
              <h2 className="text-lg font-semibold text-slate-900">Интерфейс</h2>
              <div className="space-y-4">
                <div className="flex items-center justify-between p-3 border border-slate-200 rounded-lg">
                  <div>
                    <h3 className="text-sm font-medium text-slate-900">Компактный режим</h3>
                    <p className="text-xs text-slate-500 mt-0.5">
                      Уменьшает отступы и размеры элементов для более плотного отображения данных
                    </p>
                  </div>
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input
                      type="checkbox"
                      checked={isCompact}
                      onChange={toggleCompact}
                      className="sr-only peer"
                    />
                    <div className="w-11 h-6 bg-slate-200 peer-focus:outline-none peer-focus:ring-2 peer-focus:ring-indigo-500 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-indigo-600"></div>
                  </label>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'logs' && (
            <div className="space-y-4">
              <h2 className="text-lg font-semibold text-slate-900">Логи изменений</h2>
              <p className="text-xs text-slate-500">Кто что и когда изменил в настройках. Для записей «Изменён профиль» и «Изменён сотрудник» доступно восстановление предыдущего состояния.</p>
              {auditLogsLoading ? (
                <p className="text-sm text-slate-500">Загрузка...</p>
              ) : (
                <div className="overflow-x-auto no-scrollbar w-full border border-slate-200 rounded-lg">
                  <table className="min-w-full text-sm">
                    <thead className="bg-slate-50">
                      <tr>
                        <th className="px-3 py-2 text-left font-medium text-slate-700">Когда</th>
                        <th className="px-3 py-2 text-left font-medium text-slate-700">Кто</th>
                        <th className="px-3 py-2 text-left font-medium text-slate-700">Действие</th>
                        <th className="px-3 py-2 text-left font-medium text-slate-700">Объект</th>
                        <th className="px-3 py-2 text-right font-medium text-slate-700">Действия</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {auditLogs.length === 0 ? (
                        <tr><td colSpan={5} className="px-3 py-6 text-center text-slate-500">Нет записей.</td></tr>
                      ) : (
                        auditLogs.map((log) => (
                          <tr key={log.id} className="hover:bg-slate-50">
                            <td className="px-3 py-2 text-slate-600">{new Date(log.created_at).toLocaleString('ru')}</td>
                            <td className="px-3 py-2 text-slate-600">{log.user_name ?? '—'}</td>
                            <td className="px-3 py-2 text-slate-600">{log.action_display}</td>
                            <td className="px-3 py-2 text-slate-600">{log.target_repr || log.target_id || '—'}</td>
                            <td className="px-3 py-2 text-right">
                              {(log.action === 'profile_updated' || log.action === 'employee_updated') && Object.keys(log.old_data || {}).length > 0 ? (
                                <button
                                  type="button"
                                  onClick={() => handleRestoreAudit(log.id)}
                                  disabled={auditRestoringId === log.id}
                                  className="text-indigo-600 hover:text-indigo-700 disabled:opacity-50"
                                >
                                  {auditRestoringId === log.id ? 'Восстановление...' : 'Восстановить'}
                                </button>
                              ) : null}
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}

          {activeTab === 'notifications' && (
            <div className="space-y-4">
              <h2 className="text-lg font-semibold text-slate-900">Уведомления</h2>
              <div className="space-y-3">
                <div className="flex items-center justify-between p-3 border border-slate-200 rounded-lg">
                  <div>
                    <h3 className="text-sm font-medium text-slate-900">Email уведомления</h3>
                    <p className="text-xs text-slate-500 mt-0.5">Получать уведомления на email</p>
                  </div>
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input 
                      type="checkbox" 
                      className="sr-only peer" 
                      checked={notifications.email}
                      onChange={() => handleNotificationChange('email')}
                    />
                    <div className="w-11 h-6 bg-slate-200 peer-focus:outline-none peer-focus:ring-2 peer-focus:ring-indigo-500 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-indigo-600"></div>
                  </label>
                </div>
                <div className="flex items-center justify-between p-3 border border-slate-200 rounded-lg">
                  <div>
                    <h3 className="text-sm font-medium text-slate-900">SMS уведомления</h3>
                    <p className="text-xs text-slate-500 mt-0.5">Получать уведомления по SMS</p>
                  </div>
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input 
                      type="checkbox" 
                      className="sr-only peer" 
                      checked={notifications.sms}
                      onChange={() => handleNotificationChange('sms')}
                    />
                    <div className="w-11 h-6 bg-slate-200 peer-focus:outline-none peer-focus:ring-2 peer-focus:ring-indigo-500 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-indigo-600"></div>
                  </label>
                </div>
                <div className="flex items-center justify-between p-3 border border-slate-200 rounded-lg">
                  <div className="flex items-center gap-2">
                    <MessageCircle className="h-4 w-4 text-green-600" />
                    <div>
                      <h3 className="text-sm font-medium text-slate-900">WhatsApp уведомления</h3>
                      <p className="text-xs text-slate-500 mt-0.5">Получать уведомления в WhatsApp</p>
                    </div>
                  </div>
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input 
                      type="checkbox" 
                      className="sr-only peer" 
                      checked={notifications.whatsapp}
                      onChange={() => handleNotificationChange('whatsapp')}
                    />
                    <div className="w-11 h-6 bg-slate-200 peer-focus:outline-none peer-focus:ring-2 peer-focus:ring-indigo-500 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-green-600"></div>
                  </label>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      <Drawer
        isOpen={employeesDrawerOpen}
        onClose={() => { setEmployeesDrawerOpen(false); setEditingEmployee(null); }}
        title={editingEmployee ? 'Редактировать сотрудника' : 'Добавить сотрудника'}
      >
        <EmployeeForm
          employee={editingEmployee}
          onSubmit={handleSaveEmployee}
          onCancel={() => { setEmployeesDrawerOpen(false); setEditingEmployee(null); }}
          loading={employeeFormLoading}
        />
      </Drawer>
    </div>
  );
}
