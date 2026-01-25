import React, { useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import {
  LayoutDashboard,
  Wallet,
  Home,
  MessageSquare,
  MoreHorizontal,
  X,
} from 'lucide-react';
import { useUserMenu } from '../../../hooks/useUserMenu';

const mainNavItems = [
  { name: 'Дашборд', href: '/dashboard', icon: LayoutDashboard },
  { name: 'Финансы', href: '/accounts', icon: Wallet },
  { name: 'Активы', href: '/properties', icon: Home },
  { name: 'Заявки', href: '/requests', icon: MessageSquare },
];

export function BottomNav() {
  const location = useLocation();
  const [moreOpen, setMoreOpen] = useState(false);
  const allMenuItems = useUserMenu();

  // Фильтруем пункты, которые не в основных
  const moreItems = allMenuItems.filter(
    (item) =>
      !mainNavItems.some((main) => main.href === item.href) &&
      item.name !== 'Дашборд'
  );

  return (
    <>
      <nav
        className="
          fixed bottom-0 left-0 right-0 z-40
          bg-white border-t border-slate-200
          safe-area-bottom
          h-16
        "
      >
        <div className="h-full px-2 flex items-center justify-around">
          {mainNavItems.map((item) => {
            const Icon = item.icon;
            const isActive =
              location.pathname === item.href ||
              (item.href !== '/dashboard' &&
                location.pathname.startsWith(item.href));

            return (
              <Link
                key={item.href}
                to={item.href}
                className={`
                  flex flex-col items-center justify-center
                  flex-1 h-full min-h-[44px]
                  transition-colors
                  ${isActive ? 'text-indigo-600' : 'text-slate-500'}
                `}
              >
                <Icon className="w-5 h-5 mb-1" />
                <span className="text-[10px] font-medium">{item.name}</span>
              </Link>
            );
          })}
          <button
            onClick={() => setMoreOpen(true)}
            className={`
              flex flex-col items-center justify-center
              flex-1 h-full min-h-[44px]
              transition-colors
              ${moreOpen ? 'text-indigo-600' : 'text-slate-500'}
            `}
            aria-label="Еще"
          >
            <MoreHorizontal className="w-5 h-5 mb-1" />
            <span className="text-[10px] font-medium">Еще</span>
          </button>
        </div>
      </nav>

      {/* More Sheet */}
      {moreOpen && (
        <div
          className="fixed inset-0 z-50 bg-black bg-opacity-50"
          onClick={() => setMoreOpen(false)}
        >
          <div
            className="
              fixed bottom-0 left-0 right-0
              bg-white rounded-t-2xl shadow-2xl
              safe-area-bottom
              max-h-[80vh] overflow-y-auto
            "
            onClick={(e) => e.stopPropagation()}
          >
            <div className="sticky top-0 bg-white border-b border-slate-200 px-4 py-3 flex items-center justify-between">
              <h2 className="text-lg font-semibold text-slate-900">Меню</h2>
              <button
                onClick={() => setMoreOpen(false)}
                className="p-2 -mr-2 text-slate-600 hover:text-slate-900 hover:bg-slate-100 rounded-lg transition-colors min-h-[44px] min-w-[44px] flex items-center justify-center"
                aria-label="Закрыть"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="p-4 space-y-1">
              {moreItems.map((item) => {
                const Icon = item.icon;
                const isActive =
                  location.pathname === item.href ||
                  (item.href !== '/dashboard' &&
                    location.pathname.startsWith(item.href));

                return (
                  <Link
                    key={item.href}
                    to={item.href}
                    onClick={() => setMoreOpen(false)}
                    className={`
                      flex items-center gap-3 px-3 py-3 rounded-lg
                      transition-colors min-h-[44px]
                      ${
                        isActive
                          ? 'bg-indigo-50 text-indigo-600'
                          : 'text-slate-700 hover:bg-slate-100'
                      }
                    `}
                  >
                    <Icon className="w-5 h-5 flex-shrink-0" />
                    <span className="text-sm font-medium">{item.name}</span>
                  </Link>
                );
              })}
            </div>
          </div>
        </div>
      )}
    </>
  );
}
