import React, { useMemo } from 'react';
import { useMediaQuery } from '../../hooks/useMediaQuery';
import { DataTable, Column } from './DataTable';
import { DataCardList, CardData } from './DataCardList';

interface ResponsiveDataViewProps<T extends { id: number | string }> {
  data: T[];
  columns: Column<T>[];
  toCardData: (row: T) => CardData;
  onRowClick?: (row: T) => void;
  actions?: (row: T) => React.ReactNode;
  loading?: boolean;
  emptyMessage?: string;
  className?: string;
}

export function ResponsiveDataView<T extends { id: number | string }>({
  data,
  columns,
  toCardData,
  onRowClick,
  actions,
  loading = false,
  emptyMessage = 'Нет данных',
  className = '',
}: ResponsiveDataViewProps<T>) {
  const isMobile = useMediaQuery('(max-width: 768px)');

  const cardData = useMemo(() => data.map(toCardData), [data, toCardData]);

  if (isMobile) {
    return (
      <DataCardList
        data={cardData}
        onCardClick={onRowClick ? (card) => {
          const row = data.find((r) => r.id === card.id);
          if (row) onRowClick(row);
        } : undefined}
        loading={loading}
        emptyMessage={emptyMessage}
        className={className}
      />
    );
  }

  return (
    <DataTable
      data={data}
      columns={columns}
      onRowClick={onRowClick}
      actions={actions}
      loading={loading}
      emptyMessage={emptyMessage}
      className={className}
    />
  );
}
