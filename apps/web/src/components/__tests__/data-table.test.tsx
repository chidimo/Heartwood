import { describe, expect, it, vi } from 'vitest';
import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { createColumnHelper } from '@tanstack/react-table';
import { DataTable } from '../data-table';

interface Row {
  id: string;
  name: string;
  amount: number;
}

const column = createColumnHelper<Row>();
const columns = [
  column.accessor('name', {
    header: 'Name',
    cell: info => <a href={`/rows/${info.row.original.id}`}>{info.getValue()}</a>,
  }),
  column.accessor('amount', { header: 'Amount' }),
];
const data: Row[] = [
  { id: 'a', name: 'Flat', amount: 10 },
  { id: 'b', name: 'Camry', amount: 20 },
];

describe('DataTable', () => {
  it('shows the headers and one row per item, in a table named for screen readers', () => {
    render(<DataTable label="Things" data={data} columns={columns} />);
    const table = screen.getByRole('table', { name: 'Things' });
    expect(within(table).getByRole('columnheader', { name: 'Name' })).toBeInTheDocument();
    expect(within(table).getAllByRole('row')).toHaveLength(3);
    expect(within(table).getByText('Camry')).toBeInTheDocument();
  });

  it('shows the empty message in place of rows', () => {
    render(<DataTable label="Things" data={[]} columns={columns} empty="Nothing here." />);
    expect(screen.getByText('Nothing here.')).toBeInTheDocument();
  });

  it('opens a row on click, but leaves a link inside the row to do its own job', async () => {
    const onRowClick = vi.fn();
    render(<DataTable label="Things" data={data} columns={columns} onRowClick={onRowClick} />);
    await userEvent.click(screen.getByText('20'));
    expect(onRowClick).toHaveBeenCalledWith(data[1]);
    onRowClick.mockClear();
    const link = screen.getByRole('link', { name: 'Flat' });
    link.addEventListener('click', event => event.preventDefault());
    await userEvent.click(link);
    expect(onRowClick).not.toHaveBeenCalled();
  });

  it('says it is updating while a new page loads', () => {
    render(<DataTable label="Things" data={data} columns={columns} isUpdating />);
    expect(screen.getByRole('status')).toHaveTextContent('Updating');
  });
});
