import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { LucideIcon } from 'lucide-react';
import { useUserMenu } from '../../../hooks/useUserMenu';

interface NavGroup {
  label?: string;
  items: Array<{
    name: string;
    href: string;
    icon: LucideIcon;
  }>;
}

export function SideNav() {
  const location = useLocation();
  const menuItems = useUserMenu();

  // Группируем меню
  const groups: NavGroup[] = [
    {
      label: 'Финансы',
      items: menuItems.filter((item) =>
        ['Счета', 'Депозиты', 'Начисления', 'Поступления', 'Отчет'].includes(
          item.name
        )
      ),
    },
    {
      label: 'Активы',
      items: menuItems.filter((item) =>
        ['Недвижимость', 'Контрагенты', 'Договоры'].includes(item.name)
      ),
    },
    {
      label: 'Коммуникации',
      items: menuItems.filter((item) =>
        ['Рассылки', 'Заявки'].includes(item.name)
      ),
    },
    {
      label: 'Система',
      items: menuItems.filter((item) =>
        ['Настройки', 'Помощь'].includes(item.name)
      ),
    },
  ].filter((group) => group.items.length > 0);

  // Дашборд всегда первый
  const dashboardItem = menuItems.find((item) => item.name === 'Дашборд');

  return (
    <nav className="w-64 bg-white border-r border-slate-200 h-full overflow-y-auto">
      <div className="p-4">
        {dashboardItem && (
          <NavItem
            item={dashboardItem}
            isActive={location.pathname === dashboardItem.href}
          />
        )}
      </div>

      {groups.map((group, groupIndex) => (
        <div key={groupIndex} className="px-4 pb-4">
          {group.label && (
            <h3 className="px-3 py-2 text-xs font-semibold text-slate-500 uppercase tracking-wider">
              {group.label}
            </h3>
          )}
          <div className="space-y-1">
            {group.items.map((item) => (
              <NavItem
                key={item.href}
                item={item}
                isActive={
                  location.pathname === item.href ||
                  (item.href !== '/dashboard' &&
                    location.pathname.startsWith(item.href))
                }
              />
            ))}
          </div>
        </div>
      ))}
    </nav>
  );
}

function NavItem({
  item,
  isActive,
}: {
  item: { name: string; href: string; icon: LucideIcon };
  isActive: boolean;
}) {
  const Icon = item.icon;

  return (
    <Link
      to={item.href}
      className={`
        flex items-center gap-3 px-3 py-2 rounded-lg
        transition-colors min-h-[44px]
        ${
          isActive
            ? 'bg-indigo-600 text-white'
            : 'text-slate-700 hover:bg-slate-100'
        }
      `}
    >
      <Icon className={`w-5 h-5 flex-shrink-0 ${isActive ? 'text-white' : 'text-slate-400'}`} />
      <span className="text-sm font-medium">{item.name}</span>
    </Link>
  );
}
