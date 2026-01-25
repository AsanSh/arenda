import React from 'react';
import { MoreVertical } from 'lucide-react';
import { Amount } from '../ui/Amount';
import { StatusChip } from '../ui/StatusChip';

export interface CardData {
  id: number | string;
  primary: React.ReactNode;
  secondary?: React.ReactNode;
  tertiary?: React.ReactNode;
  amount?: number | string;
  status?: 'overdue' | 'due_soon' | 'paid' | 'new' | 'pending';
  date?: string;
  actions?: React.ReactNode;
}

interface DataCardListProps {
  data: CardData[];
  onCardClick?: (card: CardData) => void;
  loading?: boolean;
  emptyMessage?: string;
  className?: string;
}

export function DataCardList({
  data,
  onCardClick,
  loading = false,
  emptyMessage = 'Нет данных',
  className = '',
}: DataCardListProps) {
  if (loading) {
    return (
      <div className="space-y-3">
        {[...Array(5)].map((_, i) => (
          <div
            key={i}
            className="bg-white rounded-lg border border-slate-200 p-4 animate-pulse"
          >
            <div className="h-4 bg-slate-200 rounded w-3/4 mb-2" />
            <div className="h-3 bg-slate-200 rounded w-1/2 mb-2" />
            <div className="h-3 bg-slate-200 rounded w-1/4" />
          </div>
        ))}
      </div>
    );
  }

  if (data.length === 0) {
    return (
      <div className="bg-white rounded-lg border border-slate-200 p-12 text-center">
        <p className="text-slate-600">{emptyMessage}</p>
      </div>
    );
  }

  return (
    <div className={`space-y-3 ${className}`}>
      {data.map((card) => (
        <div
          key={card.id}
          className={`
            bg-white rounded-lg border border-slate-200 p-4
            ${onCardClick ? 'cursor-pointer hover:border-indigo-300 hover:shadow-sm transition-all' : ''}
          `}
          onClick={() => onCardClick?.(card)}
        >
          <div className="flex items-start justify-between gap-3">
            <div className="flex-1 min-w-0">
              {/* Primary */}
              <div className="mb-1">
                {typeof card.primary === 'string' ? (
                  <p className="text-sm md:text-base font-semibold text-slate-900 truncate">
                    {card.primary}
                  </p>
                ) : (
                  card.primary
                )}
              </div>

              {/* Secondary */}
              {card.secondary && (
                <div className="mb-1">
                  {typeof card.secondary === 'string' ? (
                    <p className="text-sm text-slate-600 truncate">
                      {card.secondary}
                    </p>
                  ) : (
                    card.secondary
                  )}
                </div>
              )}

              {/* Tertiary */}
              {card.tertiary && (
                <div className="mb-2">
                  {typeof card.tertiary === 'string' ? (
                    <p className="text-xs text-slate-500">{card.tertiary}</p>
                  ) : (
                    card.tertiary
                  )}
                </div>
              )}

              {/* Bottom row: Status, Date, Amount */}
              <div className="flex items-center justify-between gap-2 mt-2">
                <div className="flex items-center gap-2 flex-wrap">
                  {card.status && <StatusChip status={card.status} size="small" />}
                  {card.date && (
                    <span className="text-xs text-slate-500">{card.date}</span>
                  )}
                </div>
                {card.amount && (
                  <div className="text-sm md:text-base font-semibold text-slate-900">
                    <Amount value={card.amount} />
                  </div>
                )}
              </div>
            </div>

            {/* Actions */}
            {card.actions && (
              <div onClick={(e) => e.stopPropagation()}>
                {card.actions}
              </div>
            )}
          </div>
        </div>
      ))}
    </div>
  );
}
