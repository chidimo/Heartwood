import { fireEvent, render, screen } from '@testing-library/react-native';
import type { AssetDto } from '@heartwood/shared';
import AssetsScreen from '../../app/(app)/(drawer)/index';

const mockPush = jest.fn();
jest.mock('expo-router', () => ({ useRouter: () => ({ push: mockPush }) }));
jest.mock('../utils/use-debounced-value', () => ({ useDebouncedValue: <T,>(value: T) => value }));

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

const fetchNextPage = jest.fn();
let state: Record<string, unknown>;
const mockUseAssets = jest.fn((_filters: unknown) => state);
jest.mock('../features/assets/api', () => ({
  useAssets: (filters: unknown) => mockUseAssets(filters),
}));

const lastFilters = () => mockUseAssets.mock.calls[mockUseAssets.mock.calls.length - 1]?.[0];

const withItems = (items: AssetDto[], over: Record<string, unknown> = {}) => ({
  items,
  total: items.length,
  isPending: false,
  error: null,
  hasNextPage: false,
  isFetchingNextPage: false,
  isRefetching: false,
  fetchNextPage,
  refetch: jest.fn(),
  ...over,
});

describe('AssetsScreen', () => {
  beforeEach(() => {
    mockPush.mockClear();
    mockUseAssets.mockClear();
    fetchNextPage.mockClear();
    state = withItems([
      asset('1', { description: '3-bedroom flat', institution: 'Lagos Land Registry' }),
      asset('2', {
        type: 'cash',
        description: 'Dollar account',
        currency: 'USD',
        roughValue: 1250.5,
      }),
    ]);
  });

  it('lists the assets with their type, where they are held and their value, and the total', async () => {
    await render(<AssetsScreen />);
    expect(screen.getByText('3-bedroom flat')).toBeTruthy();
    expect(screen.getByText('Lagos Land Registry')).toBeTruthy();
    expect(screen.getByText('₦45,000,000')).toBeTruthy();
    expect(screen.getByText('US$1,250.50')).toBeTruthy();
    expect(screen.getByText('2 assets')).toBeTruthy();
  });

  it('opens an asset', async () => {
    await render(<AssetsScreen />);
    await fireEvent.press(screen.getByText('3-bedroom flat'));
    expect(mockPush).toHaveBeenCalledWith('/asset/1');
  });

  it('starts with nothing searched or filtered', async () => {
    await render(<AssetsScreen />);
    expect(lastFilters()).toEqual({ q: '', type: undefined, currency: undefined });
  });

  it('searches on the server as you type', async () => {
    await render(<AssetsScreen />);
    await fireEvent.changeText(screen.getByLabelText('Search'), 'camry');
    expect(lastFilters()).toMatchObject({ q: 'camry' });
  });

  it('filters by type and currency', async () => {
    await render(<AssetsScreen />);
    await fireEvent.press(screen.getByRole('button', { name: 'Type' }));
    await fireEvent.press(screen.getByRole('menuitem', { name: 'Vehicle' }));
    expect(lastFilters()).toMatchObject({ type: 'vehicle' });
    await fireEvent.press(screen.getByRole('button', { name: 'Currency' }));
    await fireEvent.press(screen.getByRole('menuitem', { name: 'Pound (£)' }));
    expect(lastFilters()).toMatchObject({ type: 'vehicle', currency: 'GBP' });
  });

  it('clears the search and the filters together', async () => {
    await render(<AssetsScreen />);
    expect(screen.queryByText('Clear search and filters')).toBeNull();
    await fireEvent.changeText(screen.getByLabelText('Search'), 'x');
    await fireEvent.press(screen.getByText('Clear search and filters'));
    expect(lastFilters()).toEqual({ q: '', type: undefined, currency: undefined });
  });

  it('loads the next page when the list is scrolled to its end, if there is one', async () => {
    state = withItems([asset('1')], { hasNextPage: true, total: 25 });
    await render(<AssetsScreen />);
    await fireEvent(screen.getByText('Asset 1'), 'endReached');
    expect(fetchNextPage).toHaveBeenCalled();
  });

  it('does not ask for more when there is no next page', async () => {
    await render(<AssetsScreen />);
    await fireEvent(screen.getByText('3-bedroom flat'), 'endReached');
    expect(fetchNextPage).not.toHaveBeenCalled();
  });

  it('says so when nothing matches, and when there are no assets at all', async () => {
    state = withItems([]);
    await render(<AssetsScreen />);
    expect(screen.getByText('Nothing listed yet. Add the first thing you own.')).toBeTruthy();
    await fireEvent.changeText(screen.getByLabelText('Search'), 'zzz');
    expect(screen.getByText('No assets match. Clear the search or the filters.')).toBeTruthy();
  });
});
