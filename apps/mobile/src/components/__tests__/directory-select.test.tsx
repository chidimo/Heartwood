import { fireEvent, render, screen } from '@testing-library/react-native';
import { DirectorySelect } from '../directory-select';

const entry = {
  id: 'd1',
  name: 'Baptist Medical Centre',
  institutionType: 'hospital' as const,
  state: 'Oyo',
  city: 'Ogbomoso',
};

const mockFetchNextPage = jest.fn();
jest.mock('../../features/inventory/api', () => ({
  useOrganizationDirectory: () => ({
    items: [entry],
    total: 1,
    isPending: false,
    hasNextPage: true,
    isFetchingNextPage: false,
    fetchNextPage: mockFetchNextPage,
  }),
}));

describe('DirectorySelect', () => {
  it('opens the list and hands the chosen entry back', async () => {
    const onPick = jest.fn();
    await render(<DirectorySelect value={null} onPick={onPick} />);
    await fireEvent.press(screen.getByRole('button', { name: 'Choose from our list' }));
    expect(screen.getByText('Hospital or clinic · Ogbomoso, Oyo')).toBeTruthy();
    await fireEvent.press(screen.getByRole('menuitem'));
    expect(onPick).toHaveBeenCalledWith(expect.objectContaining({ id: 'd1' }));
  });

  it('loads the next page when the list is scrolled to its end', async () => {
    await render(<DirectorySelect value={null} onPick={jest.fn()} />);
    await fireEvent.press(screen.getByRole('button', { name: 'Choose from our list' }));
    await fireEvent(screen.getByText('Baptist Medical Centre'), 'endReached');
    expect(mockFetchNextPage).toHaveBeenCalled();
  });

  it('shows the chosen organisation', async () => {
    await render(<DirectorySelect value={entry} onPick={jest.fn()} />);
    expect(screen.getByText('Baptist Medical Centre')).toBeTruthy();
  });
});
