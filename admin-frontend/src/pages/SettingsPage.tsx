import React, { useState, useEffect } from 'react';
import { useDensity } from '../contexts/DensityContext';
import { useUser } from '../contexts/UserContext';
import { UserIcon, PaintBrushIcon, BellIcon } from '@heroicons/react/24/outline';
import { MessageCircle } from 'lucide-react';

type TabType = 'profile' | 'interface' | 'notifications';

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
    { id: 'interface' as TabType, label: 'Интерфейс', icon: PaintBrushIcon },
    { id: 'notifications' as TabType, label: 'Уведомления', icon: BellIcon },
  ];

  // Сохранение профиля
  const handleSaveProfile = async () => {
    setProfileLoading(true);
    try {
      // Сохраняем в localStorage
      localStorage.setItem('user_profile', JSON.stringify(profile));
      // Здесь можно добавить вызов API для сохранения на сервере
      // await client.patch('/user/profile/', profile);
      alert('Профиль успешно сохранен');
    } catch (error) {
      console.error('Error saving profile:', error);
      alert('Ошибка при сохранении профиля');
    } finally {
      setProfileLoading(false);
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
    </div>
  );
}
