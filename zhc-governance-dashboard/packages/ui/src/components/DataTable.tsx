import React from 'react';
import { cn } from '../utils';

export interface Column<T> {
  key: string;
  header: React.ReactNode;
  accessor: (row: T) => React.ReactNode;
  width?: string;
  align?: 'left' | 'center' | 'right';
  sortable?: boolean;
}

export interface DataTableProps<T extends { id: string | number }> {
  columns: Column<T>[];
  data: T[];
  onRowClick?: (row: T) => void;
  emptyState?: React.ReactNode;
  className?: string;
  caption?: string;
}

export function DataTable<T extends { id: string | number }>({
  columns,
  data,
  onRowClick,
  emptyState,
  className,
  caption,
}: DataTableProps<T>) {
  return (
    <div className={cn('w-full overflow-x-auto rounded-[var(--radius-lg)] border border-[var(--color-border)]', className)}>
      <table className="w-full border-collapse text-[var(--text-sm)]">
        {caption && (
          <caption className="sr-only">{caption}</caption>
        )}
        <thead>
          <tr className="border-b border-[var(--color-border)] bg-[var(--color-bg-surface2)]">
            {columns.map((col) => (
              <th
                key={col.key}
                className={cn(
                  'px-[var(--space-4)] py-[var(--space-3)] font-[var(--font-semibold)] text-[var(--color-text-muted)] text-[var(--text-xs)] uppercase tracking-wider',
                  col.align === 'center' && 'text-center',
                  col.align === 'right' && 'text-right',
                  !col.align && 'text-left',
                )}
                style={col.width ? { width: col.width } : undefined}
              >
                {col.header}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {data.length === 0 ? (
            <tr>
              <td
                colSpan={columns.length}
                className="px-[var(--space-4)] py-[var(--space-10)] text-center text-[var(--color-text-muted)]"
              >
                {emptyState ?? 'No data available.'}
              </td>
            </tr>
          ) : (
            data.map((row, rowIdx) => (
              <tr
                key={row.id}
                className={cn(
                  'border-b border-[var(--color-border-subtle)] last:border-0',
                  rowIdx % 2 === 0 ? 'bg-[var(--color-bg-surface)]' : 'bg-[var(--color-bg-surface)]',
                  onRowClick && 'cursor-pointer transition-colors duration-[var(--transition-fast)] hover:bg-[var(--color-bg-surface3)]',
                )}
                onClick={onRowClick ? () => onRowClick(row) : undefined}
              >
                {columns.map((col) => (
                  <td
                    key={col.key}
                    className={cn(
                      'px-[var(--space-4)] py-[var(--space-3)] text-[var(--color-text)]',
                      col.align === 'center' && 'text-center',
                      col.align === 'right' && 'text-right',
                    )}
                  >
                    {col.accessor(row)}
                  </td>
                ))}
              </tr>
            ))
          )}
        </tbody>
      </table>
    </div>
  );
}
