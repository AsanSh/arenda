import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import client from '../api/client';

/** Права по разделам (от API permissions_sections) — для роутов и меню по типам */
export interface TenantPermissions {
  dashboard?: string[];
  contracts?: string[];
  accruals?: string[];
  payments?: string[];
  deposits?: string[];
  properties?: string[];
  tenants?: string[];
  settings?: string[];
  menu: string; // 'full' | 'owner' | 'landlord' | 'tenant' | 'employee' | 'master' | 'minimal'
}

interface UserPermissions {
  can_read_tenants: boolean;
  can_write_tenants: boolean;
  can_read_properties: boolean;
  can_write_properties: boolean;
  can_read_contracts: boolean;
  can_write_contracts: boolean;
  can_read_accruals: boolean;
  can_write_accruals: boolean;
  can_read_payments: boolean;
  can_write_payments: boolean;
  can_read_reports: boolean;
  can_write_reports: boolean;
  can_read_notifications: boolean;
  can_write_notifications: boolean;
  can_read_settings: boolean;
  can_write_settings: boolean;
  can_read_help: boolean;
  can_write_help: boolean;
  can_read_requests: boolean;
  can_write_requests: boolean;
  can_manage_requests: boolean;
}

interface Counterparty {
  id: number;
  name: string;
  type: string;
  type_display: string;
  email: string;
  phone: string;
}

interface User {
  id: number;
  username: string;
  email: string;
  first_name: string;
  last_name: string;
  role: 'admin' | 'staff' | 'tenant' | 'landlord' | 'investor';
  role_display: string;
  phone: string;
  counterparty: Counterparty | null;
  counterparty_id: number | null;
  preferences: Record<string, any>;
  permissions: UserPermissions;
  permissions_sections?: TenantPermissions;
  is_admin: boolean;
  is_staff: boolean;
  is_client: boolean;
}

interface UserContextType {
  user: User | null;
  loading: boolean;
  error: string | null;
  fetchUser: () => Promise<void>;
  hasPermission: (permission: keyof UserPermissions) => boolean;
  /** Проверка права по разделу и действию (permissions_sections). */
  hasPermissionSection: (section: string, action: string) => boolean;
  /** Тип контрагента/роль для меню: counterparty.type или user.role */
  tenantType: string | null;
  canWrite: (resource: string) => boolean;
  canRead: (resource: string) => boolean;
}

const UserContext = createContext<UserContextType | undefined>(undefined);

export function UserProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchUser = async () => {
    try {
      // На странице логина не вызываем /auth/me/ — иначе при 401 возможен бесконечный редирект/обновление
      const path = typeof window !== 'undefined' ? (window.location.pathname || '/').replace(/\/+$/, '') || '/' : '';
      const isLoginPage = path === '/login' || path.endsWith('/login');
      if (isLoginPage) {
        setUser(null);
        setLoading(false);
        return;
      }

      setLoading(true);
      setError(null);
      
      const isAuthorized = localStorage.getItem('whatsapp_authorized') === 'true' || 
                          localStorage.getItem('auth_token');
      
      if (!isAuthorized) {
        setUser(null);
        setLoading(false);
        return;
      }
      
      console.log('🔍 fetchUser - calling /auth/me/');
      const response = await client.get('/auth/me/');
      console.log('🔍 fetchUser - response status:', response.status);
      console.log('🔍 fetchUser - response data:', response.data);
      const userData = response.data;
      
      // Отладочная информация (всегда включена для отладки)
      console.log('✅ User profile loaded from /auth/me/:', userData);
      console.log('   - id:', userData.id);
      console.log('   - username:', userData.username);
      console.log('   - role:', userData.role);
      console.log('   - role_display:', userData.role_display);
      console.log('   - is_admin:', userData.is_admin);
      console.log('   - is_staff:', userData.is_staff);
      console.log('   - is_client:', userData.is_client);
      console.log('   - phone:', userData.phone);
      console.log('   - counterparty:', userData.counterparty);
      console.log('   - counterparty_id:', userData.counterparty_id);
      
      setUser(userData);
      
      // Сохраняем в localStorage для совместимости
      localStorage.setItem('user_role', userData.role);
      localStorage.setItem('user_id', userData.id.toString());
      localStorage.setItem('user_name', userData.username);
      if (userData.phone) {
        localStorage.setItem('whatsapp_phone', userData.phone);
      }
      if (userData.counterparty_id) {
        localStorage.setItem('tenant_id', userData.counterparty_id.toString());
      }
    } catch (err: any) {
      console.error('Error fetching user:', err);
      setError(err.response?.data?.detail || 'Ошибка загрузки профиля');
      setUser(null);
      
      // Если 401, очищаем авторизацию
      if (err.response?.status === 401) {
        localStorage.removeItem('whatsapp_authorized');
        localStorage.removeItem('auth_token');
        localStorage.removeItem('user_role');
        localStorage.removeItem('user_id');
        localStorage.removeItem('user_name');
        localStorage.removeItem('tenant_id');
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchUser();
  }, []);

  const hasPermission = (permission: keyof UserPermissions): boolean => {
    if (!user) return false;
    return user.permissions[permission] || false;
  };

  const hasPermissionSection = (section: string, action: string): boolean => {
    if (!user?.permissions_sections) return false;
    const sectionPerms = user.permissions_sections[section as keyof TenantPermissions];
    if (Array.isArray(sectionPerms)) return sectionPerms.includes(action);
    return false;
  };

  const tenantType = user ? (user.counterparty?.type ?? user.role) : null;

  const canWrite = (resource: string): boolean => {
    if (!user) return false;
    // Админ и суперадмин могут редактировать всё
    if (user.is_admin || user.role === 'admin') return true;
    if (user.is_staff) {
      // Staff может писать только в рамках назначений
      return user.permissions[`can_write_${resource.toLowerCase()}` as keyof UserPermissions] || false;
    }
    // Клиенты не могут писать мастер-данные
    return false;
  };

  const canRead = (resource: string): boolean => {
    if (!user) return false;
    return user.permissions[`can_read_${resource.toLowerCase()}` as keyof UserPermissions] || false;
  };

  return (
    <UserContext.Provider
      value={{
        user,
        loading,
        error,
        fetchUser,
        hasPermission,
        hasPermissionSection,
        tenantType,
        canWrite,
        canRead,
      }}
    >
      {children}
    </UserContext.Provider>
  );
}

export function useUser() {
  const context = useContext(UserContext);
  if (context === undefined) {
    throw new Error('useUser must be used within a UserProvider');
  }
  return context;
}
