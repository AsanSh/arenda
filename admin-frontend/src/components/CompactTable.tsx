import React, { ReactNode } from 'react';
import { useCompactStyles } from '../hooks/useCompactStyles';

interface CompactTableProps {
  children: ReactNode;
  className?: string;
}

/**
 * Компактная таблица с адаптивностью
 * Desktop: полная таблица
 * Mobile: card-style rows
 */
export function CompactTable({ children, className = '' }: CompactTableProps) {
  const compact = useCompactStyles();
  
  return (
    <div className={`bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden ${className}`}>
      {/* Desktop Table */}
      <div className="hidden md:block overflow-x-auto">
        <table className="min-w-full divide-y divide-gray-100">
          {children}
        </table>
      </div>
      
      {/* Mobile будет обрабатываться в родительском компоненте */}
      <div className="md:hidden">
        {children}
      </div>
    </div>
  );
}

interface CompactTableHeaderProps {
  children: ReactNode;
  className?: string;
}

export function CompactTableHeader({ children, className = '' }: CompactTableHeaderProps) {
  const compact = useCompactStyles();
  
  return (
    <thead className={`bg-gray-50 ${className}`}>
      {children}
    </thead>
  );
}

interface CompactTableRowProps {
  children: ReactNode;
  className?: string;
  onClick?: () => void;
}

export function CompactTableRow({ children, className = '', onClick }: CompactTableRowProps) {
  const compact = useCompactStyles();
  
  return (
    <tr 
      className={`hover:bg-slate-50 transition-colors group ${compact.rowHeight} ${onClick ? 'cursor-pointer' : ''} ${className}`}
      onClick={onClick}
    >
      {children}
    </tr>
  );
}

interface CompactTableHeaderCellProps {
  children: ReactNode;
  className?: string;
  onClick?: () => void;
  sortable?: boolean;
  sortIcon?: ReactNode;
}

export function CompactTableHeaderCell({ 
  children, 
  className = '', 
  onClick, 
  sortable = false,
  sortIcon 
}: CompactTableHeaderCellProps) {
  const compact = useCompactStyles();
  
  return (
    <th 
      className={`${compact.headerPadding} text-left ${compact.headerText} text-gray-500 tracking-wider ${
        sortable || onClick ? 'cursor-pointer hover:bg-gray-100 transition-colors' : ''
      } ${className}`}
      onClick={onClick}
    >
      {children} {sortIcon}
    </th>
  );
}

interface CompactTableCellProps {
  children: ReactNode;
  className?: string;
  align?: 'left' | 'right' | 'center';
}

export function CompactTableCell({ children, className = '', align = 'left' }: CompactTableCellProps) {
  const compact = useCompactStyles();
  
  const alignClass = align === 'right' ? 'text-right' : align === 'center' ? 'text-center' : 'text-left';
  
  return (
    <td className={`${compact.cellPadding} ${alignClass} ${className}`}>
      <div className={compact.tableText}>
        {children}
      </div>
    </td>
  );
}
