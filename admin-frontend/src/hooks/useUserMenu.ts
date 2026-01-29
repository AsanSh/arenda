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
const ADMIN_MENU_ITEMS: MenuItem[] = [
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

export function useUserMenu(): MenuItem[] {
  const { user } = useUser();

  // Если user ещё не загружен, но в localStorage роль admin — показываем полное меню (после редиректа с логина)
  const storedRole = typeof localStorage !== 'undefined' ? localStorage.getItem('user_role') : null;
  if (!user && storedRole === 'admin') {
    return ADMIN_MENU_ITEMS;
  }

  if (!user) {
    return [];
  }

  // Admin/Staff меню (полное)
  // ВАЖНО: Проверяем ТОЛЬКО если пользователь действительно admin/staff
  // НЕ проверяем is_client, чтобы не пропустить арендаторов в админское меню
  // ГАРАНТИЯ: Админ ВСЕГДА получает админское меню, независимо от других условий
  const isAdminRole = user.role === 'admin';
  const isStaffRole = user.role === 'staff';
  const isAdminOrStaff = (user.is_staff || user.is_admin) && (isAdminRole || isStaffRole);
  
  // ДОПОЛНИТЕЛЬНАЯ ГАРАНТИЯ: Если роль 'admin' в БД, ВСЕГДА показываем админское меню
  // Это защита от любых ошибок в данных или логике
  if (isAdminRole) {
    console.log('🔒 ADMIN GUARANTEE: User has admin role, forcing admin menu');
  }
  
  console.log('🔍 useUserMenu - isAdminOrStaff check:', {
    is_staff: user.is_staff,
    is_admin: user.is_admin,
    role: user.role,
    isAdminRole,
    isStaffRole,
    result: isAdminOrStaff
  });
  
  if (isAdminOrStaff || isAdminRole) {
    return ADMIN_MENU_ITEMS;
  }

  // Client меню (только просмотр своих данных + заявки)
  // Арендаторы, арендодатели, инвесторы видят только свои данные
  // Проверяем и is_client, и роль напрямую для надежности
  const isClient = user.is_client || user.role === 'tenant' || user.role === 'landlord' || user.role === 'investor';
  console.log('🔍 useUserMenu - isClient check:', {
    is_client: user.is_client,
    role: user.role,
    result: isClient
  });
  
  if (isClient) {
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
    
    console.log('✅ useUserMenu - returning client menu with', menuItems.length, 'items');
    return menuItems;
  }

  console.warn('⚠️ useUserMenu - no menu matched, returning empty array');
  return [];
}
