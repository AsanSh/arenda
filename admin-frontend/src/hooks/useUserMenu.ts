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
  MessageSquare,
} from 'lucide-react';
import { getAllowedSections, dbTypeToUserType } from '../utils/permissions';
import type { Section } from '../utils/permissions';

interface MenuItem {
  name: string;
  href: string;
  icon: React.ComponentType<{ className?: string }>;
  divider?: boolean;
  type?: 'divider';
  /** Раздел матрицы доступа: пункт показывается, если у пользователя есть доступ к разделу */
  section?: Section;
}

const FULL_MENU: MenuItem[] = [
  { name: 'Дашборд', href: '/dashboard', icon: LayoutDashboard, section: 'dashboard' },
  { name: 'Счета', href: '/accounts', icon: Wallet, section: 'accounts' },
  { name: 'Депозиты', href: '/deposits', icon: Banknote, section: 'deposits' },
  { divider: true } as MenuItem,
  { name: 'Недвижимость', href: '/properties', icon: Home, section: 'properties' },
  { name: 'Контрагенты', href: '/tenants', icon: Users, section: 'tenants' },
  { divider: true } as MenuItem,
  { name: 'Договоры', href: '/contracts', icon: FileText, section: 'contracts' },
  { name: 'Начисления', href: '/accruals', icon: Calculator, section: 'accruals' },
  { name: 'Поступления', href: '/payments', icon: CreditCard, section: 'payments' },
  { name: 'Отчет', href: '/reports', icon: FileBarChart, section: 'reports' },
  { divider: true } as MenuItem,
  { name: 'Рассылки', href: '/notifications', icon: Mail },
  { name: 'Заявки', href: '/requests', icon: MessageSquare },
  { name: 'Настройки', href: '/settings', icon: Settings, section: 'settings' },
  { name: 'Помощь', href: '/help', icon: HelpCircle },
];

export function useUserMenu(): MenuItem[] {
  const { user, tenantType } = useUser();

  const storedRole = typeof localStorage !== 'undefined' ? localStorage.getItem('user_role') : null;
  if (!user && storedRole === 'admin') {
    return FULL_MENU;
  }

  if (!user) {
    return [];
  }

  const userType = dbTypeToUserType(tenantType ?? user.role ?? null);
  const allowedSections = new Set(getAllowedSections(userType));

  const filtered = FULL_MENU.filter((item) => {
    if (item.divider) return true;
    if (!item.section) return true;
    return allowedSections.has(item.section);
  });

  return filtered;
}
