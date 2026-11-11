import { beforeEach, describe, expect, it, vi } from 'vitest';
import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import type { AssetDto, AssetPage } from '@heartwood/shared';
import { AssetsPage } from '../assets';

const navigate = vi.fn();
vi.mock('@tanstack/react-router', () => ({
  Link: ({ children, to }: { children: React.ReactNode; to: string }) => (
    <a href={to}>{children}</a>
  ),
  useNavigate: () => navigate,
}));
vi.mock('../../lib/use-debounced-value', () => ({ useDebouncedValue: <T,>(value: T) => value }));

const asset = (id: string, over: Partial<AssetDto> = {}): AssetDto => ({
  id,
  type: 'property',
  description: `Asset ${id}`,
  institution: null,
  currency: 'NGN',
  roughValue: 45000000,
  notes: null,
  createdAt: '',
  updatedAt: '',
  ...over,
});

let result: AssetPage;
const useAssets = vi.fn((search: unknown) => ({
  search,
  isPending: false,
  isError: false,
  isPlaceholderData: false,
  data: result,
}));

vi.mock('../../features/api', () => ({
  useAssets: (search: unknown) => useAssets(search),
  useCreateAsset: () => ({ mutate: vi.fn(), isPending: false }),
}));

const page = (items: AssetDto[], over: Partial<AssetPage> = {}): AssetPage => ({
  items,
  page: 1,
  limit: 10,
  total: items.length,
  totalPages: 1,
  ...over,
});

const lastSearch = () => useAssets.mock.calls[useAssets.mock.calls.length - 1]?.[0];

describe('AssetsPage', () => {
  beforeEach(() => {
    useAssets.mockClear();
    navigate.mockClear();
    result = page([
      asset('1', { description: '3-bedroom flat', institution: 'Lagos Land Registry' }),
      asset('2', {
        type: 'cash',
        description: 'Dollar account',
        currency: 'USD',
        roughValue: 1250.5,
      }),
    ]);
  });

  it('shows the assets in a table with their type, where they are held and their value', () => {
    render(<AssetsPage />);
    const table = screen.getByRole('table', { name: 'Assets' });
    expect(within(table).getByRole('link', { name: '3-bedroom flat' })).toHaveAttribute(
      'href',
      '/assets/$id'
    );
    expect(within(table).getByText('Lagos Land Registry')).toBeInTheDocument();
    expect(within(table).getByText('₦45,000,000')).toBeInTheDocument();
    expect(within(table).getByText('US$1,250.50')).toBeInTheDocument();
    expect(screen.getByText('2 assets')).toBeInTheDocument();
  });

  it('opens an asset when its row is clicked', async () => {
    render(<AssetsPage />);
    await userEvent.click(screen.getByText('₦45,000,000'));
    expect(navigate).toHaveBeenCalledWith({ to: '/assets/$id', params: { id: '1' } });
  });

  it('asks the server for the first page of ten, with nothing filtered', () => {
    render(<AssetsPage />);
    expect(lastSearch()).toEqual({
      q: '',
      type: undefined,
      currency: undefined,
      page: 1,
      limit: 10,
    });
  });

  it('searches on the server and goes back to the first page', async () => {
    result = page([asset('1')], { page: 2, total: 25, totalPages: 3 });
    render(<AssetsPage />);
    await userEvent.type(screen.getByLabelText('Search'), 'camry');
    expect(lastSearch()).toMatchObject({ q: 'camry', page: 1 });
  });

  it('filters by type and by currency', async () => {
    render(<AssetsPage />);
    await userEvent.click(screen.getByLabelText('Type'));
    await userEvent.click(screen.getByText('Vehicle'));
    expect(lastSearch()).toMatchObject({ type: 'vehicle', page: 1 });
    await userEvent.click(screen.getByLabelText('Currency'));
    await userEvent.click(screen.getByText('Pound (£)'));
    expect(lastSearch()).toMatchObject({ type: 'vehicle', currency: 'GBP', page: 1 });
  });

  it('moves between pages', async () => {
    result = page([asset('1')], { total: 25, totalPages: 3 });
    render(<AssetsPage />);
    await userEvent.click(screen.getByRole('button', { name: 'Next' }));
    expect(lastSearch()).toMatchObject({ page: 2 });
  });

  it('clears the search and the filters in one go', async () => {
    render(<AssetsPage />);
    expect(screen.queryByRole('button', { name: 'Clear search and filters' })).toBeNull();
    await userEvent.type(screen.getByLabelText('Search'), 'x');
    await userEvent.click(screen.getByRole('button', { name: 'Clear search and filters' }));
    expect(lastSearch()).toMatchObject({ q: '', type: undefined, currency: undefined, page: 1 });
  });

  it('says so when nothing matches, and when there are no assets at all', async () => {
    result = page([]);
    render(<AssetsPage />);
    expect(screen.getByText('No assets yet. Add the first thing you own.')).toBeInTheDocument();
    await userEvent.type(screen.getByLabelText('Search'), 'zzz');
    expect(
      screen.getByText('No assets match. Clear the search or the filters.')
    ).toBeInTheDocument();
  });
});
