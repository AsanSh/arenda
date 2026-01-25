import React from 'react';
import { LucideIcon, Inbox } from 'lucide-react';

interface EmptyStateProps {
  icon?: LucideIcon;
  title: string;
  description?: string;
  action?: {
    label: string;
    onClick: () => void;
  };
  className?: string;
}

export function EmptyState({
  icon: Icon = Inbox,
  title,
  description,
  action,
  className = '',
}: EmptyStateProps) {
  return (
    <div
      className={`
        flex flex-col items-center justify-center
        py-12 px-4 text-center
        ${className}
      `}
    >
      <Icon className="w-12 h-12 md:w-16 md:h-16 text-slate-400 mb-4" />
      <h3 className="text-lg md:text-xl font-semibold text-slate-900 mb-2">
        {title}
      </h3>
      {description && (
        <p className="text-sm md:text-base text-slate-600 mb-6 max-w-md">
          {description}
        </p>
      )}
      {action && (
        <button
          onClick={action.onClick}
          className="
            px-4 py-2 bg-indigo-600 text-white rounded-lg
            hover:bg-indigo-700 transition-colors
            font-medium text-sm md:text-base
            min-h-[44px] min-w-[120px]
          "
        >
          {action.label}
        </button>
      )}
    </div>
  );
}
