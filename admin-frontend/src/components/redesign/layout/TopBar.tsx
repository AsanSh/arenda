import React, { useState } from 'react';
import { Search, Bell, User, Menu } from 'lucide-react';
import { useUser } from '../../../contexts/UserContext';

interface TopBarProps {
  onMenuClick?: () => void;
  onSearch?: (query: string) => void;
}

export function TopBar({ onMenuClick, onSearch }: TopBarProps) {
  const { user } = useUser();
  const [searchQuery, setSearchQuery] = useState('');

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    onSearch?.(searchQuery);
  };

  return (
    <header className="sticky top-0 z-40 bg-white border-b border-slate-200 h-14 md:h-16">
      <div className="h-full px-4 md:px-6 flex items-center justify-between gap-4">
        {/* Left: Logo + Menu (mobile) */}
        <div className="flex items-center gap-3 md:gap-4">
          <button
            onClick={onMenuClick}
            className="md:hidden p-2 -ml-2 text-slate-600 hover:text-slate-900 hover:bg-slate-100 rounded-lg transition-colors min-h-[44px] min-w-[44px] flex items-center justify-center"
            aria-label="Меню"
          >
            <Menu className="w-5 h-5" />
          </button>
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 bg-gradient-to-br from-indigo-600 to-indigo-700 rounded-lg flex items-center justify-center shadow-sm">
              <span className="text-white font-bold text-sm">A</span>
            </div>
            <h1 className="hidden sm:block text-lg font-semibold text-slate-900">
              AMT
            </h1>
          </div>
        </div>

        {/* Center: Search */}
        <form onSubmit={handleSearch} className="flex-1 max-w-md">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <input
              type="search"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Поиск..."
              className="w-full pl-10 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
            />
          </div>
        </form>

        {/* Right: Notifications + Profile */}
        <div className="flex items-center gap-2">
          <button
            className="p-2 text-slate-600 hover:text-slate-900 hover:bg-slate-100 rounded-lg transition-colors relative min-h-[44px] min-w-[44px] flex items-center justify-center"
            aria-label="Уведомления"
          >
            <Bell className="w-5 h-5" />
            <span className="absolute top-1 right-1 w-2 h-2 bg-red-500 rounded-full"></span>
          </button>
          <button
            className="p-2 text-slate-600 hover:text-slate-900 hover:bg-slate-100 rounded-lg transition-colors min-h-[44px] min-w-[44px] flex items-center justify-center"
            aria-label="Профиль"
          >
            <User className="w-5 h-5" />
          </button>
          {user && (
            <div className="hidden md:block ml-2">
              <p className="text-sm font-medium text-slate-900">
                {user.username}
              </p>
              {user.phone && (
                <p className="text-xs text-slate-500">{user.phone}</p>
              )}
            </div>
          )}
        </div>
      </div>
    </header>
  );
}
