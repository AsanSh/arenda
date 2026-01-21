import React, { ReactNode } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { 
  HomeIcon, 
  UserGroupIcon,
  DocumentTextIcon, 
  CalculatorIcon,
  CreditCardIcon,
  BanknotesIcon,
  WalletIcon,
  ChartBarIcon,
  Squares2X2Icon,
  EnvelopeIcon,
  Cog6ToothIcon,
  QuestionMarkCircleIcon,
  DocumentChartBarIcon
} from '@heroicons/react/24/outline';

interface LayoutProps {
  children: ReactNode;
}

type NavigationItem = 
  | { 
      name: string; 
      href: string; 
      icon: React.ComponentType<{ className?: string }>;
    }
  | { 
      type: 'divider';
    };

const navigation: NavigationItem[] = [
  { name: 'Дашборд', href: '/dashboard', icon: Squares2X2Icon },
  { name: 'Счета', href: '/accounts', icon: WalletIcon },
  { name: 'Депозиты', href: '/deposits', icon: BanknotesIcon },
  { type: 'divider' },
  { name: 'Недвижимость', href: '/properties', icon: HomeIcon },
  { name: 'Контрагенты', href: '/tenants', icon: UserGroupIcon },
  { type: 'divider' },
  { name: 'Договоры', href: '/contracts', icon: DocumentTextIcon },
  { name: 'Начисления', href: '/accruals', icon: CalculatorIcon },
  { name: 'Поступления', href: '/payments', icon: CreditCardIcon },
  { name: 'Прогноз', href: '/forecast', icon: ChartBarIcon },
  { name: 'Отчет', href: '/reports', icon: DocumentChartBarIcon },
  { type: 'divider' },
  { name: 'Рассылки', href: '/notifications', icon: EnvelopeIcon },
  { name: 'Настройки', href: '/settings', icon: Cog6ToothIcon },
  { name: 'Помощь', href: '/help', icon: QuestionMarkCircleIcon },
];

export default function Layout({ children }: LayoutProps) {
  const location = useLocation();

  return (
    <div className="min-h-screen" style={{ backgroundColor: '#F8FAFC' }}>
      {/* Sidebar */}
      <div className="fixed inset-y-0 left-0 w-64 bg-white shadow-xl border-r border-gray-200">
        <div className="flex flex-col h-full">
          {/* Logo */}
          <div className="flex items-center justify-center h-16 border-b border-gray-200 bg-gradient-to-r from-primary-50 to-white">
            <div className="flex items-center space-x-2">
              <div className="w-8 h-8 bg-gradient-to-br from-primary-600 to-primary-700 rounded-lg flex items-center justify-center shadow-sm">
                <span className="text-white font-bold text-sm">A</span>
              </div>
              <h1 className="text-gray-900 font-semibold text-sm" style={{ fontFamily: 'system-ui, -apple-system, sans-serif' }}>
                AMT
              </h1>
            </div>
          </div>
          
          {/* Navigation */}
          <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto">
            {navigation.map((item, index) => {
              if ('type' in item && item.type === 'divider') {
                return (
                  <div key={`divider-${index}`} className="my-2 border-t border-gray-200"></div>
                );
              }
              
              if ('href' in item && 'icon' in item) {
                const navItem = item as { name: string; href: string; icon: React.ComponentType<{ className?: string }> };
                const isActive = location.pathname === navItem.href;
                const Icon = navItem.icon;
                
                return (
                  <Link
                    key={navItem.name}
                    to={navItem.href}
                    className={`group flex items-center px-3 py-2.5 text-sm font-medium rounded-xl transition-all duration-200 ${
                      isActive
                        ? 'bg-gradient-to-r from-primary-600 to-primary-700 text-white shadow-md shadow-primary-200'
                        : 'text-gray-700 hover:bg-gray-50 hover:text-gray-900'
                    }`}
                  >
                    <Icon className={`mr-3 h-5 w-5 flex-shrink-0 transition-colors ${
                      isActive ? 'text-white' : 'text-gray-400 group-hover:text-gray-600'
                    }`} />
                    <span className="truncate">{navItem.name}</span>
                  </Link>
                );
              }
              
              return null;
            })}
          </nav>
        </div>
      </div>

      {/* Main content */}
      <div className="pl-64">
        <main className="p-8">
          {children}
        </main>
      </div>
    </div>
  );
}
