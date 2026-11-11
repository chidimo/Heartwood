import { useState } from 'react';
import { Link, useNavigate } from '@tanstack/react-router';
import { createColumnHelper } from '@tanstack/react-table';
import { toast } from 'sonner';
import {
  ASSET_TYPES,
  ASSET_TYPE_LABELS,
  CURRENCIES,
  CURRENCY_LABELS,
  formatValue,
  type AssetDto,
  type AssetType,
  type Currency,
} from '@heartwood/shared';
import { getErrorMessage } from '../api/client';
import { AssetForm } from '../components/asset-form';
import { Button } from '../components/button';
import { DataTable } from '../components/data-table';
import { Heading } from '../components/layout';
import { Modal } from '../components/modal';
import { Pagination } from '../components/pagination';
import { QueryState } from '../components/query-state';
import { SelectField } from '../components/select-field';
import { TextField } from '../components/text-field';
import { useAssets, useCreateAsset } from '../features/api';
import { useDebouncedValue } from '../lib/use-debounced-value';

const PAGE_SIZE = 10;
const ALL = 'all';

const TYPE_FILTER = [
  { value: ALL, label: 'All types' },
  ...ASSET_TYPES.map(value => ({ value: value as string, label: ASSET_TYPE_LABELS[value] })),
];
const CURRENCY_FILTER = [
  { value: ALL, label: 'All currencies' },
  ...CURRENCIES.map(value => ({ value: value as string, label: CURRENCY_LABELS[value] })),
];

const column = createColumnHelper<AssetDto>();

const columns = [
  column.accessor('description', {
    header: 'Asset',
    cell: info => (
      <Link
        to="/assets/$id"
        params={{ id: info.row.original.id }}
        className="font-medium text-primary-700 hover:underline dark:text-primary-200"
      >
        {info.getValue()}
      </Link>
    ),
  }),
  column.accessor('type', { header: 'Type', cell: info => ASSET_TYPE_LABELS[info.getValue()] }),
  column.accessor('institution', {
    header: 'Held at',
    cell: info => info.getValue() ?? '—',
  }),
  column.accessor('roughValue', {
    header: () => <span className="block text-right">Value</span>,
    cell: info => (
      <span className="block text-right tabular-nums">
        {formatValue(info.getValue(), info.row.original.currency)}
      </span>
    ),
  }),
];

export const AssetsPage = () => {
  const navigate = useNavigate();
  const createAsset = useCreateAsset();
  const [isAdding, setIsAdding] = useState(false);
  const [search, setSearch] = useState('');
  const [type, setType] = useState(ALL);
  const [currency, setCurrency] = useState(ALL);
  const [page, setPage] = useState(1);
  const debouncedSearch = useDebouncedValue(search);

  const assets = useAssets({
    q: debouncedSearch,
    type: type === ALL ? undefined : (type as AssetType),
    currency: currency === ALL ? undefined : (currency as Currency),
    page,
    limit: PAGE_SIZE,
  });

  // Any change to the search or the filters starts again from the first page.
  const handleSearch = (value: string) => {
    setSearch(value);
    setPage(1);
  };
  const handleType = (value: string) => {
    setType(value);
    setPage(1);
  };
  const handleCurrency = (value: string) => {
    setCurrency(value);
    setPage(1);
  };
  const handleClear = () => {
    setSearch('');
    setType(ALL);
    setCurrency(ALL);
    setPage(1);
  };

  const isFiltered = search.trim() !== '' || type !== ALL || currency !== ALL;

  return (
    <>
      <div className="flex items-center justify-between gap-3">
        <Heading>Assets</Heading>
        <Button onClick={() => setIsAdding(true)}>Add an asset</Button>
      </div>
      <div className="grid gap-4 sm:grid-cols-3">
        <TextField label="Search" value={search} onChange={handleSearch} />
        <SelectField label="Type" value={type} options={TYPE_FILTER} onChange={handleType} />
        <SelectField
          label="Currency"
          value={currency}
          options={CURRENCY_FILTER}
          onChange={handleCurrency}
        />
      </div>
      <QueryState query={assets}>
        {data => (
          <>
            <div className="flex items-center justify-between text-sm text-ink/60 dark:text-white/60">
              <span>
                {data.total} {data.total === 1 ? 'asset' : 'assets'}
              </span>
              {isFiltered && (
                <Button variant="link" onClick={handleClear}>
                  Clear search and filters
                </Button>
              )}
            </div>
            <DataTable
              label="Assets"
              data={data.items}
              columns={columns}
              isUpdating={assets.isPlaceholderData}
              onRowClick={asset => void navigate({ to: '/assets/$id', params: { id: asset.id } })}
              empty={
                isFiltered
                  ? 'No assets match. Clear the search or the filters.'
                  : 'No assets yet. Add the first thing you own.'
              }
            />
            <Pagination page={data.page} totalPages={data.totalPages} onPageChange={setPage} />
          </>
        )}
      </QueryState>
      {isAdding && (
        <Modal title="Add an asset" onClose={() => setIsAdding(false)}>
          <AssetForm
            submitLabel="Save asset"
            isPending={createAsset.isPending}
            onSubmit={input =>
              createAsset.mutate(input, {
                onSuccess: () => {
                  toast.success('Asset saved');
                  setIsAdding(false);
                },
                onError: error => toast.error(getErrorMessage(error, "Couldn't save. Try again.")),
              })
            }
          />
        </Modal>
      )}
    </>
  );
};
