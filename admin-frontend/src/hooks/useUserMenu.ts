import { useUser } from '../contexts/UserContext';
import React from 'react';
import { 
  LayoutDashboard, 
  Wallet, 
  Banknote, 
  Home, 
  Users, 
  FileText, 
  Calculator, 
  CreditCard, 
  FileBarChart, 
  Mail, 
  Settings, 
  HelpCircle,
  MessageSquare
} from 'lucide-react';

interface MenuItem {
  name: string;
  href: string;
  icon: React.ComponentType<{ className?: string }>;
  divider?: boolean;
  type?: 'divider';
}

/**
 * Хук для получения меню навигации в зависимости от роли пользователя
 */
export function useUserMenu(): MenuItem[] {
  const { user } = useUser();

  // Отладочная информация
  if (process.env.NODE_ENV === 'development') {
    console.log('useUserMenu - user:', user);
    console.log('useUserMenu - user.is_staff:', user?.is_staff);
    console.log('useUserMenu - user.is_admin:', user?.is_admin);
    console.log('useUserMenu - user.role:', user?.role);
  }

  if (!user) {
    console.warn('useUserMenu - user is null');
    return [];
  }

  // Admin/Staff меню (полное)
  // ВАЖНО: Проверяем ТОЛЬКО если пользователь действительно admin/staff
  // НЕ проверяем is_client, чтобы не пропустить арендаторов в админское меню
  if ((user.is_staff || user.is_admin) && (user.role === 'admin' || user.role === 'staff')) {
    const adminMenu = [
      { name: 'Дашборд', href: '/dashboard', icon: LayoutDashboard },
      { name: 'Счета', href: '/accounts', icon: Wallet },
      { name: 'Депозиты', href: '/deposits', icon: Banknote },
      { divider: true } as any,
      { name: 'Недвижимость', href: '/properties', icon: Home },
      { name: 'Контрагенты', href: '/tenants', icon: Users },
      { divider: true } as any,
      { name: 'Договоры', href: '/contracts', icon: FileText },
      { name: 'Начисления', href: '/accruals', icon: Calculator },
      { name: 'Поступления', href: '/payments', icon: CreditCard },
      { name: 'Отчет', href: '/reports', icon: FileBarChart },
      { divider: true } as any,
      { name: 'Рассылки', href: '/notifications', icon: Mail },
      { name: 'Заявки', href: '/requests', icon: MessageSquare },
      { name: 'Настройки', href: '/settings', icon: Settings },
      { name: 'Помощь', href: '/help', icon: HelpCircle },
    ];
    
    if (process.env.NODE_ENV === 'development') {
      console.log('useUserMenu - returning admin menu with', adminMenu.length, 'items');
    }
    
    return adminMenu;
  }

  // Client меню (только просмотр своих данных + заявки)
  // Арендаторы, арендодатели, инвесторы видят только свои данные
  // Проверяем и is_client, и роль напрямую для надежности
  if (user.is_client || user.role === 'tenant' || user.role === 'landlord' || user.role === 'investor') {
    const menuItems: MenuItem[] = [
      { name: 'Дашборд', href: '/dashboard', icon: LayoutDashboard },
      { divider: true } as any,
      { name: 'Мои договоры', href: '/contracts', icon: FileText },
    ];
    
    // Только арендаторы видят свои начисления и поступления
    if (user.role === 'tenant') {
      menuItems.push(
        { name: 'Мои начисления', href: '/accruals', icon: Calculator },
        { name: 'Мои поступления', href: '/payments', icon: CreditCard }
      );
    }
    
    // Арендодатели и инвесторы видят отчеты
    if (user.role === 'landlord' || user.role === 'investor') {
      menuItems.push({ name: 'Отчет', href: '/reports', icon: FileBarChart });
    }
    
    menuItems.push(
      { divider: true } as any,
      { name: 'Заявки', href: '/requests', icon: MessageSquare },
      { name: 'Настройки', href: '/settings', icon: Settings },
      { name: 'Помощь', href: '/help', icon: HelpCircle }
    );
    
    return menuItems;
  }

  return [];
}
