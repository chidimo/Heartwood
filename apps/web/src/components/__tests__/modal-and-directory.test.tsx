import { describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { DirectorySelect } from '../directory-select';
import { Modal } from '../modal';
import { Pagination } from '../pagination';

const entry = {
  id: 'd1',
  name: 'Baptist Medical Centre',
  institutionType: 'hospital',
  state: 'Oyo',
  city: 'Ogbomoso',
};

vi.mock('../../features/api', () => ({
  useOrganizationDirectory: () => ({
    isFetching: false,
    data: { items: [entry], page: 1, limit: 10, total: 1, totalPages: 1 },
  }),
}));

describe('Modal', () => {
  it('shows its title and closes with the close button and Escape', async () => {
    const onClose = vi.fn();
    render(
      <Modal title="Add a person" onClose={onClose}>
        <p>form</p>
      </Modal>
    );
    expect(screen.getByRole('dialog', { name: 'Add a person' })).toBeInTheDocument();
    await userEvent.click(screen.getByRole('button', { name: 'Close' }));
    await userEvent.keyboard('{Escape}');
    expect(onClose).toHaveBeenCalledTimes(2);
  });
});

describe('DirectorySelect', () => {
  it('offers the list and hands the chosen entry back', async () => {
    const onPick = vi.fn();
    render(<DirectorySelect value={null} onPick={onPick} />);
    await userEvent.click(screen.getByLabelText('Choose from our list'));
    expect(screen.getByText('Hospital or clinic · Ogbomoso, Oyo')).toBeInTheDocument();
    await userEvent.click(screen.getByText('Baptist Medical Centre'));
    expect(onPick).toHaveBeenCalledWith(expect.objectContaining({ id: 'd1' }));
  });
});

describe('Pagination', () => {
  it('renders nothing for a single page', () => {
    const { container } = render(<Pagination page={1} totalPages={1} onPageChange={() => {}} />);
    expect(container).toBeEmptyDOMElement();
  });

  it('moves between pages and disables the ends', async () => {
    const onPageChange = vi.fn();
    render(<Pagination page={1} totalPages={3} onPageChange={onPageChange} />);
    expect(screen.getByRole('button', { name: 'Previous' })).toBeDisabled();
    expect(screen.getByRole('button', { name: '1' })).toHaveAttribute('aria-current', 'page');
    await userEvent.click(screen.getByRole('button', { name: 'Next' }));
    await userEvent.click(screen.getByRole('button', { name: '3' }));
    expect(onPageChange).toHaveBeenNthCalledWith(1, 2);
    expect(onPageChange).toHaveBeenNthCalledWith(2, 3);
  });
});
