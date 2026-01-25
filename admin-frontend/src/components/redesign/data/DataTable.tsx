import React, { useState, useMemo } from 'react';
import { ChevronUp, ChevronDown, MoreVertical } from 'lucide-react';
import { Amount } from '../ui/Amount';
import { StatusChip } from '../ui/StatusChip';

export interface Column<T> {
  key: string;
  header: string;
  accessor: (row: T) => React.ReactNode;
  sortable?: boolean;
  align?: 'left' | 'right' | 'center';
  width?: string;
}

interface DataTableProps<T> {
  data: T[];
  columns: Column<T>[];
  onRowClick?: (row: T) => void;
  actions?: (row: T) => React.ReactNode;
  loading?: boolean;
  emptyMessage?: string;
  className?: string;
}

type SortDirection = 'asc' | 'desc' | null;

export function DataTable<T extends { id: number | string }>({
  data,
  columns,
  onRowClick,
  actions,
  loading = false,
  emptyMessage = 'Нет данных',
  className = '',
}: DataTableProps<T>) {
  const [sortColumn, setSortColumn] = useState<string | null>(null);
  const [sortDirection, setSortDirection] = useState<SortDirection>(null);

  const sortedData = useMemo(() => {
    if (!sortColumn || !sortDirection) return data;

    const column = columns.find((col) => col.key === sortColumn);
    if (!column?.sortable) return data;

    return [...data].sort((a, b) => {
      const aVal = column.accessor(a);
      const bVal = column.accessor(b);

      if (typeof aVal === 'number' && typeof bVal === 'number') {
        return sortDirection === 'asc' ? aVal - bVal : bVal - aVal;
      }

      const aStr = String(aVal);
      const bStr = String(bVal);

      if (sortDirection === 'asc') {
        return aStr.localeCompare(bStr, 'ru');
      }
      return bStr.localeCompare(aStr, 'ru');
    });
  }, [data, sortColumn, sortDirection, columns]);

  const handleSort = (columnKey: string) => {
    const column = columns.find((col) => col.key === columnKey);
    if (!column?.sortable) return;

    if (sortColumn === columnKey) {
      if (sortDirection === 'asc') {
        setSortDirection('desc');
      } else if (sortDirection === 'desc') {
        setSortColumn(null);
        setSortDirection(null);
      } else {
        setSortDirection('asc');
      }
    } else {
      setSortColumn(columnKey);
      setSortDirection('asc');
    }
  };

  if (loading) {
    return (
      <div className="bg-white rounded-lg border border-slate-200 overflow-hidden">
        <div className="animate-pulse space-y-3 p-4">
          {[...Array(5)].map((_, i) => (
            <div key={i} className="h-12 bg-slate-200 rounded" />
          ))}
        </div>
      </div>
    );
  }

  if (sortedData.length === 0) {
    return (
      <div className="bg-white rounded-lg border border-slate-200 p-12 text-center">
        <p className="text-slate-600">{emptyMessage}</p>
      </div>
    );
  }

  return (
    <div className={`bg-white rounded-lg border border-slate-200 overflow-hidden ${className}`}>
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead className="bg-slate-50 border-b border-slate-200">
            <tr>
              {columns.map((column) => (
                <th
                  key={column.key}
                  className={`
                    px-4 py-3 text-left text-xs font-semibold text-slate-700 uppercase tracking-wider
                    ${column.align === 'right' ? 'text-right' : ''}
                    ${column.align === 'center' ? 'text-center' : ''}
                    ${column.sortable ? 'cursor-pointer hover:bg-slate-100 select-none' : ''}
                  `}
                  style={{ width: column.width }}
                  onClick={() => column.sortable && handleSort(column.key)}
                >
                  <div className="flex items-center gap-2">
                    {column.header}
                    {column.sortable && sortColumn === column.key && (
                      <>
                        {sortDirection === 'asc' ? (
                          <ChevronUp className="w-4 h-4" />
                        ) : (
                          <ChevronDown className="w-4 h-4" />
                        )}
                      </>
                    )}
                  </div>
                </th>
              ))}
              {actions && <th className="px-4 py-3 w-12"></th>}
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-200">
            {sortedData.map((row) => (
              <tr
                key={row.id}
                className={`
                  hover:bg-slate-50 transition-colors
                  ${onRowClick ? 'cursor-pointer' : ''}
                `}
                onClick={() => onRowClick?.(row)}
              >
                {columns.map((column) => (
                  <td
                    key={column.key}
                    className={`
                      px-4 py-3 text-sm text-slate-900
                      ${column.align === 'right' ? 'text-right' : ''}
                      ${column.align === 'center' ? 'text-center' : ''}
                    `}
                  >
                    {column.accessor(row)}
                  </td>
                ))}
                {actions && (
                  <td
                    className="px-4 py-3"
                    onClick={(e) => e.stopPropagation()}
                  >
                    {actions(row)}
                  </td>
                )}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
