import React, { ReactNode } from 'react';
import { Plus } from 'lucide-react';
import { useMediaQuery } from '../../../hooks/useMediaQuery';

interface PageHeaderProps {
  title: string;
  subtitle?: string;
  actions?: ReactNode;
  primaryAction?: {
    label: string;
    onClick: () => void;
    icon?: React.ComponentType<{ className?: string }>;
  };
  className?: string;
}

export function PageHeader({
  title,
  subtitle,
  actions,
  primaryAction,
  className = '',
}: PageHeaderProps) {
  const isMobile = useMediaQuery('(max-width: 768px)');

  return (
    <div className={`mb-6 ${className}`}>
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold text-slate-900">
            {title}
          </h1>
          {subtitle && (
            <p className="mt-1 text-sm md:text-base text-slate-600">
              {subtitle}
            </p>
          )}
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          {actions}
          {primaryAction && (
            <button
              onClick={primaryAction.onClick}
              className="
                px-4 py-2 bg-indigo-600 text-white rounded-lg
                hover:bg-indigo-700 transition-colors
                font-medium text-sm md:text-base
                min-h-[44px] flex items-center gap-2
              "
            >
              {primaryAction.icon ? (
                <primaryAction.icon className="w-4 h-4 md:w-5 md:h-5" />
              ) : (
                <Plus className="w-4 h-4 md:w-5 md:h-5" />
              )}
              <span className="hidden sm:inline">{primaryAction.label}</span>
              <span className="sm:hidden">Добавить</span>
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
