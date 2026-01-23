import React, { ReactNode, useEffect } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { 
  Home, 
  Users,
  FileText, 
  Calculator,
  CreditCard,
  Banknote,
  Wallet,
  BarChart3,
  LayoutDashboard,
  Mail,
  Settings,
  HelpCircle,
  FileBarChart,
  Pin,
  PinOff,
  User,
  LogOut,
  Menu,
  X
} from 'lucide-react';
import { useCompactStyles } from '../hooks/useCompactStyles';

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
  { name: 'Дашборд', href: '/dashboard', icon: LayoutDashboard },
  { name: 'Счета', href: '/accounts', icon: Wallet },
  { name: 'Депозиты', href: '/deposits', icon: Banknote },
  { type: 'divider' },
  { name: 'Недвижимость', href: '/properties', icon: Home },
  { name: 'Контрагенты', href: '/tenants', icon: Users },
  { type: 'divider' },
  { name: 'Договоры', href: '/contracts', icon: FileText },
  { name: 'Начисления', href: '/accruals', icon: Calculator },
  { name: 'Поступления', href: '/payments', icon: CreditCard },
  { name: 'Отчет', href: '/reports', icon: FileBarChart },
  { type: 'divider' },
  { name: 'Рассылки', href: '/notifications', icon: Mail },
  { name: 'Настройки', href: '/settings', icon: Settings },
  { name: 'Помощь', href: '/help', icon: HelpCircle },
];

// Mobile navigation items (bottom tab bar)
const mobileNavItems = [
  { name: 'Дашборд', href: '/dashboard', icon: LayoutDashboard },
  { name: 'Счета', href: '/accounts', icon: Wallet },
  { name: 'Договоры', href: '/contracts', icon: FileText },
  { name: 'Еще', href: '/dashboard', icon: Settings }, // Will be a dropdown
];

export default function Layout({ children }: LayoutProps) {
  const location = useLocation();
  const [mobileMenuOpen, setMobileMenuOpen] = React.useState(false);
  const [sidebarHovered, setSidebarHovered] = React.useState(false);
  const compact = useCompactStyles();
  
  // Состояние фиксации сайдбара (сохраняется в localStorage)
  const [isPinned, setIsPinned] = React.useState(() => {
    const saved = localStorage.getItem('sidebarPinned');
    return saved === 'true';
  });

  // Сохраняем состояние фиксации в localStorage
  useEffect(() => {
    localStorage.setItem('sidebarPinned', String(isPinned));
  }, [isPinned]);

  // Если зафиксирован, всегда expanded
  // Компактный sidebar: 56px collapsed, 200px expanded
  const isExpanded = isPinned || sidebarHovered;
  const sidebarWidth = isExpanded ? '200px' : '56px';

  const handleLogout = () => {
    // Полностью очищаем ВСЕ данные авторизации
    localStorage.removeItem('whatsapp_authorized');
    localStorage.removeItem('whatsapp_phone');
    localStorage.removeItem('user_type');
    localStorage.removeItem('tenant_id');
    localStorage.removeItem('tenant_name');
    
    // Сохраняем только настройки интерфейса
    const densityMode = localStorage.getItem('density-mode');
    const userProfile = localStorage.getItem('user_profile');
    const notificationSettings = localStorage.getItem('notification_settings');
    const sidebarPinned = localStorage.getItem('sidebarPinned');
    
    // Очищаем все
    localStorage.clear();
    sessionStorage.clear();
    
    // Восстанавливаем только настройки интерфейса (не авторизацию!)
    if (densityMode) localStorage.setItem('density-mode', densityMode);
    if (userProfile) localStorage.setItem('user_profile', userProfile);
    if (notificationSettings) localStorage.setItem('notification_settings', notificationSettings);
    if (sidebarPinned) localStorage.setItem('sidebarPinned', sidebarPinned);
    
    // Перенаправляем на страницу логина с полной перезагрузкой
    // Используем replace чтобы не было истории для кнопки "назад"
    window.location.replace('/login');
  };

  return (
    <div className="min-h-screen bg-slate-50">
      {/* Desktop Sidebar - Fintech Style: 64px collapsed, 240px expanded on hover or pinned */}
      <div 
        className="hidden md:flex md:fixed md:inset-y-0 md:left-0 md:w-16 md:bg-white md:shadow-xl md:border-r md:border-slate-200 md:transition-all md:duration-300 md:z-30 group"
        style={{ width: sidebarWidth }}
        onMouseEnter={() => !isPinned && setSidebarHovered(true)}
        onMouseLeave={() => !isPinned && setSidebarHovered(false)}
      >
        <div className="flex flex-col h-full w-full">
          {/* Logo - Компактный */}
          <div className="flex items-center justify-center h-12 border-b border-slate-200 bg-white">
            <div className="flex items-center gap-2">
              <div className="w-7 h-7 bg-gradient-to-br from-indigo-600 to-indigo-700 rounded-lg flex items-center justify-center shadow-sm flex-shrink-0">
                <span className="text-white font-bold text-xs">A</span>
              </div>
              <h1 className={`text-slate-900 font-semibold text-xs transition-opacity duration-300 whitespace-nowrap ${
                isExpanded ? 'opacity-100' : 'opacity-0'
              }`}>
                AMT
              </h1>
            </div>
          </div>
          
          {/* Кнопка фиксации - Компактная */}
          <div className="px-1.5 py-1 border-b border-slate-200">
            <button
              onClick={() => setIsPinned(!isPinned)}
              className={`w-full flex items-center ${compact.sidebarItemPadding} rounded-lg transition-all duration-200 ${
                isPinned
                  ? 'bg-indigo-50 text-indigo-600 hover:bg-indigo-100'
                  : 'text-slate-600 hover:bg-slate-50'
              }`}
              title={isPinned ? 'Открепить меню' : 'Закрепить меню'}
            >
              {isPinned ? (
                <Pin className={`${compact.sidebarIconSize} flex-shrink-0`} />
              ) : (
                <PinOff className={`${compact.sidebarIconSize} flex-shrink-0`} />
              )}
              <span className={`ml-2 truncate transition-opacity duration-300 whitespace-nowrap text-xs ${
                isExpanded ? 'opacity-100' : 'opacity-0'
              }`}>
                {isPinned ? 'Открепить' : 'Закрепить'}
              </span>
            </button>
          </div>
          
          {/* Navigation - Компактная */}
          <nav className="flex-1 px-1.5 py-2 space-y-0.5 overflow-y-auto">
            {navigation.map((item, index) => {
              if ('type' in item && item.type === 'divider') {
                return (
                  <div key={`divider-${index}`} className="my-1 border-t border-slate-200"></div>
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
                    className={`group/nav flex items-center ${compact.sidebarItemPadding} ${compact.sidebarItemHeight} ${compact.sidebarText} font-medium rounded-lg transition-all duration-200 relative ${
                      isActive
                        ? 'bg-indigo-600 text-white shadow-sm'
                        : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'
                    }`}
                    title={navItem.name}
                  >
                    {/* Активный индикатор - тонкая линия слева */}
                    {isActive && (
                      <div className="absolute left-0 top-1/2 -translate-y-1/2 w-0.5 h-5 bg-white rounded-r"></div>
                    )}
                    <Icon className={`${compact.sidebarIconSize} flex-shrink-0 transition-colors ${
                      isActive ? 'text-white' : 'text-slate-400 group-hover/nav:text-slate-600'
                    }`} />
                    <span className={`ml-2 truncate transition-opacity duration-300 whitespace-nowrap ${
                      isExpanded ? 'opacity-100' : 'opacity-0'
                    }`}>
                      {navItem.name}
                    </span>
                  </Link>
                );
              }
              
              return null;
            })}
          </nav>
          
          {/* Профиль и выход внизу - Компактные */}
          <div className="border-t border-slate-200 px-1.5 py-1.5 space-y-0.5">
            <Link
              to="/settings"
              className={`flex items-center ${compact.sidebarItemPadding} ${compact.sidebarItemHeight} ${compact.sidebarText} font-medium rounded-lg transition-all duration-200 ${
                location.pathname === '/settings'
                  ? 'bg-indigo-600 text-white shadow-sm'
                  : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'
              }`}
              title="Профиль"
            >
              <User className={`${compact.sidebarIconSize} flex-shrink-0 transition-colors ${
                location.pathname === '/settings' ? 'text-white' : 'text-slate-400'
              }`} />
              <span className={`ml-2 truncate transition-opacity duration-300 whitespace-nowrap ${
                isExpanded ? 'opacity-100' : 'opacity-0'
              }`}>
                Профиль
              </span>
            </Link>
            <button
              onClick={handleLogout}
              className={`w-full flex items-center ${compact.sidebarItemPadding} ${compact.sidebarItemHeight} ${compact.sidebarText} font-medium rounded-lg transition-all duration-200 text-slate-600 hover:bg-red-50 hover:text-red-600`}
              title="Выйти"
            >
              <LogOut className={`${compact.sidebarIconSize} flex-shrink-0 text-slate-400`} />
              <span className={`ml-2 truncate transition-opacity duration-300 whitespace-nowrap ${
                isExpanded ? 'opacity-100' : 'opacity-0'
              }`}>
                Выйти
              </span>
            </button>
          </div>
        </div>
      </div>

      {/* Mobile Header - Компактный */}
      <div className="md:hidden fixed top-0 left-0 right-0 h-12 bg-white border-b border-slate-200 z-40 flex items-center justify-between px-3">
        <div className="flex items-center gap-2">
          <div className="w-6 h-6 bg-gradient-to-br from-indigo-600 to-indigo-700 rounded-lg flex items-center justify-center shadow-sm">
            <span className="text-white font-bold text-[10px]">A</span>
          </div>
          <h1 className="text-slate-900 font-semibold text-xs">AMT</h1>
        </div>
        <button
          onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
          className="p-1.5 rounded-lg text-slate-600 hover:bg-slate-100 min-h-[44px] min-w-[44px] flex items-center justify-center"
        >
          <Menu className="w-5 h-5" />
        </button>
      </div>

      {/* Mobile Menu Drawer - Компактный */}
      {mobileMenuOpen && (
        <div className="md:hidden fixed inset-0 z-50 bg-black bg-opacity-50" onClick={() => setMobileMenuOpen(false)}>
          <div className="fixed inset-y-0 right-0 w-64 bg-white shadow-xl" onClick={(e) => e.stopPropagation()}>
            <div className="flex flex-col h-full">
              <div className={`flex items-center justify-between ${compact.cardPaddingSmall} border-b border-slate-200`}>
                <h2 className={`${compact.sectionHeader} text-slate-900`}>Меню</h2>
                <button 
                  onClick={() => setMobileMenuOpen(false)} 
                  className={`p-2 text-slate-600 hover:bg-slate-100 rounded-lg min-h-[44px] min-w-[44px] flex items-center justify-center`}
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
              <nav className={`flex-1 px-2 py-2 space-y-0.5 overflow-y-auto`}>
                {navigation.map((item, index) => {
                  if ('type' in item && item.type === 'divider') {
                    return <div key={`divider-${index}`} className="my-1 border-t border-slate-200"></div>;
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
                        className={`group flex items-center px-2.5 py-2.5 min-h-[44px] ${compact.sidebarText} font-medium rounded-lg transition-all ${
                          isActive
                            ? 'bg-indigo-600 text-white'
                            : 'text-slate-700 hover:bg-slate-50'
                        }`}
                      >
                        <Icon className={`mr-2 ${compact.sidebarIconSize} ${isActive ? 'text-white' : 'text-slate-400'}`} />
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

      {/* Main content - Компактный: динамический отступ для сайдбара (56px collapsed, 200px expanded) */}
      <div 
        className={`pt-12 md:pt-0 transition-all duration-300 ${isExpanded ? 'md:pl-[200px]' : 'md:pl-14'}`}
      >
        <main className="p-3 md:p-4 lg:p-4 pb-20 md:pb-4">
          {children}
        </main>
      </div>

      {/* Mobile Bottom Tab Bar - Компактный */}
      <div className="md:hidden fixed bottom-0 left-0 right-0 h-14 bg-white border-t border-slate-200 z-40 flex items-center justify-around shadow-lg">
        {mobileNavItems.map((item) => {
          const isActive = location.pathname === item.href || 
            (item.href === '/dashboard' && location.pathname === '/');
          const Icon = item.icon;
          
          if (item.name === 'Еще') {
            return (
              <button
                key={item.name}
                onClick={() => setMobileMenuOpen(true)}
                className={`flex flex-col items-center justify-center flex-1 h-full min-h-[44px] gap-0.5 ${
                  isActive ? 'text-indigo-600' : 'text-slate-500'
                }`}
              >
                <Icon className="w-5 h-5" />
                <span className="text-[10px]">{item.name}</span>
              </button>
            );
          }
          
          return (
            <Link
              key={item.name}
              to={item.href}
              className={`flex flex-col items-center justify-center flex-1 h-full min-h-[44px] gap-0.5 ${
                isActive ? 'text-indigo-600' : 'text-slate-500'
              }`}
            >
              <Icon className="w-5 h-5" />
              <span className="text-[10px]">{item.name}</span>
            </Link>
          );
        })}
      </div>
    </div>
  );
}
