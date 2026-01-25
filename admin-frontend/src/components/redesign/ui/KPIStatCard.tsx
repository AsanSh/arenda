import React from 'react';
import { LucideIcon, TrendingUp, TrendingDown } from 'lucide-react';

interface KPIStatCardProps {
  label: string;
  value: string;
  change?: {
    value: number;
    isPositive: boolean;
  };
  icon?: LucideIcon;
  variant?: 'default' | 'success' | 'warning' | 'error';
  className?: string;
}

export function KPIStatCard({
  label,
  value,
  change,
  icon: Icon,
  variant = 'default',
  className = '',
}: KPIStatCardProps) {
  const variantStyles = {
    default: 'bg-white border-slate-200',
    success: 'bg-green-50 border-green-200',
    warning: 'bg-amber-50 border-amber-200',
    error: 'bg-red-50 border-red-200',
  };

  const changeColor = change?.isPositive ? 'text-green-600' : 'text-red-600';
  const ChangeIcon = change?.isPositive ? TrendingUp : TrendingDown;

  return (
    <div
      className={`
        rounded-lg border p-4 md:p-6
        ${variantStyles[variant]}
        ${className}
        min-w-[200px] flex-shrink-0
        snap-start
      `}
    >
      <div className="flex items-start justify-between mb-2">
        <p className="text-xs md:text-sm font-medium text-slate-600">{label}</p>
        {Icon && (
          <Icon className="w-4 h-4 md:w-5 md:h-5 text-slate-400 flex-shrink-0" />
        )}
      </div>
      <div className="flex items-baseline gap-2">
        <p className="text-xl md:text-2xl font-semibold text-slate-900">
          {value}
        </p>
        {change && (
          <div className={`flex items-center gap-1 ${changeColor}`}>
            <ChangeIcon className="w-3 h-3 md:w-4 md:h-4" />
            <span className="text-xs md:text-sm font-medium">
              {Math.abs(change.value)}%
            </span>
          </div>
        )}
      </div>
    </div>
  );
}
