import React from 'react';

type StatusVariant = 'overdue' | 'due_soon' | 'paid' | 'new' | 'pending';

interface StatusChipProps {
  status: StatusVariant;
  label?: string;
  size?: 'small' | 'medium';
  className?: string;
}

const statusConfig: Record<
  StatusVariant,
  { bg: string; text: string; label: string }
> = {
  overdue: {
    bg: 'bg-red-100',
    text: 'text-red-700',
    label: 'Просрочено',
  },
  due_soon: {
    bg: 'bg-amber-100',
    text: 'text-amber-700',
    label: 'К оплате',
  },
  paid: {
    bg: 'bg-green-100',
    text: 'text-green-700',
    label: 'Оплачено',
  },
  new: {
    bg: 'bg-blue-100',
    text: 'text-blue-700',
    label: 'Новое',
  },
  pending: {
    bg: 'bg-slate-100',
    text: 'text-slate-700',
    label: 'В обработке',
  },
};

export function StatusChip({
  status,
  label,
  size = 'medium',
  className = '',
}: StatusChipProps) {
  const config = statusConfig[status];
  const sizeClasses = size === 'small' ? 'px-2 py-0.5 text-xs' : 'px-2.5 py-1 text-sm';

  return (
    <span
      className={`
        inline-flex items-center rounded-full font-medium
        ${config.bg} ${config.text} ${sizeClasses}
        ${className}
      `}
    >
      {label || config.label}
    </span>
  );
}
