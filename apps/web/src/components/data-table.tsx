import type { MouseEvent, ReactNode } from 'react';
import { flexRender, getCoreRowModel, useReactTable, type ColumnDef } from '@tanstack/react-table';
import { cn } from '../lib/cn';

interface Props<TData extends object> {
  data: TData[];
  // TanStack column definitions carry their own value types, so the list can't name one.
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  columns: ColumnDef<TData, any>[];
  /** Names the table for screen readers. */
  label: string;
  /** Shown over the rows while a new page or search is loading. */
  isUpdating?: boolean;
  /** Shown in place of the rows when there are none. */
  empty?: ReactNode;
  /** Makes each row open something. Clicks on a link or button inside the row are left to them. */
  onRowClick?: (row: TData) => void;
}

/** A table in the style of Olamma's: bordered and rounded, a sticky header, rows that light up under the pointer. */
export const DataTable = <TData extends object>({
  data,
  columns,
  label,
  isUpdating = false,
  empty,
  onRowClick,
}: Props<TData>) => {
  // TanStack's hook returns functions the React lint rule can't memoise; nothing here relies on that.
  // eslint-disable-next-line react-hooks/incompatible-library
  const table = useReactTable({ data, columns, getCoreRowModel: getCoreRowModel() });
  const headerGroups = table.getHeaderGroups();
  const rows = table.getRowModel().rows;

  const handleRowClick = (row: TData) => (event: MouseEvent<HTMLTableRowElement>) => {
    if (!onRowClick) return;
    if ((event.target as HTMLElement).closest('a, button, input, select, label')) return;
    onRowClick(row);
  };

  return (
    <div className="relative overflow-auto rounded-xl border border-primary-600/20">
      {isUpdating && (
        <div
          role="status"
          className="absolute inset-0 z-10 flex items-center justify-center bg-white/60 text-sm dark:bg-ink/60"
        >
          Updating…
        </div>
      )}
      <table aria-label={label} className="w-full text-left text-sm">
        <thead className="sticky top-0 z-[1] border-b border-primary-600/20 bg-primary-600/10 backdrop-blur">
          {headerGroups.map(group => (
            <tr key={group.id}>
              {group.headers.map(header => (
                <th
                  key={header.id}
                  scope="col"
                  className="px-4 py-3 text-xs font-semibold uppercase tracking-wide text-ink/70 dark:text-white/70"
                >
                  {header.isPlaceholder
                    ? null
                    : flexRender(header.column.columnDef.header, header.getContext())}
                </th>
              ))}
            </tr>
          ))}
        </thead>
        <tbody className="divide-y divide-primary-600/10">
          {rows.length === 0 && (
            <tr>
              <td
                colSpan={headerGroups[0]?.headers.length ?? 1}
                className="px-4 py-10 text-center text-ink/60 dark:text-white/60"
              >
                {empty ?? 'Nothing to show.'}
              </td>
            </tr>
          )}
          {rows.map(row => (
            <tr
              key={row.id}
              onClick={handleRowClick(row.original)}
              className={cn('hover:bg-primary-600/5', onRowClick && 'cursor-pointer')}
            >
              {row.getVisibleCells().map(cell => (
                <td key={cell.id} className="px-4 py-3 align-top">
                  {flexRender(cell.column.columnDef.cell, cell.getContext())}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};
