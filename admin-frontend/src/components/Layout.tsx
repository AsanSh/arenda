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

// Mobile navigation items (bottom tab bar)
const mobileNavItems = [
  { name: 'Дашборд', href: '/dashboard', icon: Squares2X2Icon },
  { name: 'Счета', href: '/accounts', icon: WalletIcon },
  { name: 'Договоры', href: '/contracts', icon: DocumentTextIcon },
  { name: 'Еще', href: '/dashboard', icon: Cog6ToothIcon }, // Will be a dropdown
];

export default function Layout({ children }: LayoutProps) {
  const location = useLocation();
  const [mobileMenuOpen, setMobileMenuOpen] = React.useState(false);

  return (
    <div className="min-h-screen" style={{ backgroundColor: '#F8FAFC' }}>
      {/* Desktop Sidebar */}
      <div className="hidden md:flex md:fixed md:inset-y-0 md:left-0 md:w-64 md:bg-white md:shadow-xl md:border-r md:border-gray-200">
        <div className="flex flex-col h-full w-full">
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

      {/* Mobile Header */}
      <div className="md:hidden fixed top-0 left-0 right-0 h-14 bg-white border-b border-gray-200 z-40 flex items-center justify-between px-4">
        <div className="flex items-center space-x-2">
          <div className="w-7 h-7 bg-gradient-to-br from-primary-600 to-primary-700 rounded-lg flex items-center justify-center shadow-sm">
            <span className="text-white font-bold text-xs">A</span>
          </div>
          <h1 className="text-gray-900 font-semibold text-sm">AMT</h1>
        </div>
        <button
          onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
          className="p-2 rounded-lg text-gray-600 hover:bg-gray-100"
        >
          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
          </svg>
        </button>
      </div>

      {/* Mobile Menu Drawer */}
      {mobileMenuOpen && (
        <div className="md:hidden fixed inset-0 z-50 bg-black bg-opacity-50" onClick={() => setMobileMenuOpen(false)}>
          <div className="fixed inset-y-0 right-0 w-64 bg-white shadow-xl" onClick={(e) => e.stopPropagation()}>
            <div className="flex flex-col h-full">
              <div className="flex items-center justify-between p-4 border-b border-gray-200">
                <h2 className="text-lg font-semibold text-gray-900">Меню</h2>
                <button onClick={() => setMobileMenuOpen(false)} className="p-2 text-gray-600 hover:bg-gray-100 rounded-lg">
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
              <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto">
                {navigation.map((item, index) => {
                  if ('type' in item && item.type === 'divider') {
                    return <div key={`divider-${index}`} className="my-2 border-t border-gray-200"></div>;
                  }
                  if ('href' in item && 'icon' in item) {
                    const navItem = item as { name: string; href: string; icon: React.ComponentType<{ className?: string }> };
                    const isActive = location.pathname === navItem.href;
                    const Icon = navItem.icon;
                    return (
                      <Link
                        key={navItem.name}
                        to={navItem.href}
                        onClick={() => setMobileMenuOpen(false)}
                        className={`group flex items-center px-3 py-3 text-sm font-medium rounded-xl transition-all ${
                          isActive
                            ? 'bg-gradient-to-r from-primary-600 to-primary-700 text-white'
                            : 'text-gray-700 hover:bg-gray-50'
                        }`}
                      >
                        <Icon className={`mr-3 h-5 w-5 ${isActive ? 'text-white' : 'text-gray-400'}`} />
                        <span>{navItem.name}</span>
                      </Link>
                    );
                  }
                  return null;
                })}
              </nav>
            </div>
          </div>
        </div>
      )}

      {/* Main content */}
      <div className="md:pl-64 pt-14 md:pt-0">
        <main className="p-4 md:p-8 pb-20 md:pb-8">
          {children}
        </main>
      </div>

      {/* Mobile Bottom Tab Bar */}
      <div className="md:hidden fixed bottom-0 left-0 right-0 h-16 bg-white border-t border-gray-200 z-40 flex items-center justify-around shadow-lg">
        {mobileNavItems.map((item) => {
          const isActive = location.pathname === item.href || 
            (item.href === '/dashboard' && location.pathname === '/');
          const Icon = item.icon;
          
          if (item.name === 'Еще') {
            return (
              <button
                key={item.name}
                onClick={() => setMobileMenuOpen(true)}
                className={`flex flex-col items-center justify-center flex-1 h-full min-h-[44px] ${
                  isActive ? 'text-primary-600' : 'text-gray-500'
                }`}
              >
                <Icon className="w-6 h-6 mb-1" />
                <span className="text-xs">{item.name}</span>
              </button>
            );
          }
          
          return (
            <Link
              key={item.name}
              to={item.href}
              className={`flex flex-col items-center justify-center flex-1 h-full min-h-[44px] ${
                isActive ? 'text-primary-600' : 'text-gray-500'
              }`}
            >
              <Icon className="w-6 h-6 mb-1" />
              <span className="text-xs">{item.name}</span>
            </Link>
          );
        })}
      </div>
    </div>
  );
}
