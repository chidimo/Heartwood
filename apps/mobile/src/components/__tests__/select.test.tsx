import { fireEvent, render, screen } from '@testing-library/react-native';
import { Select } from '../select';

const OPTIONS = [
  { value: 'cash', label: 'Cash and bank' },
  { value: 'property', label: 'Property' },
] as const;

const setup = async (value: 'cash' | 'property' = 'cash') => {
  const onChange = jest.fn();
  await render(<Select label="Kind" value={value} options={OPTIONS} onChange={onChange} />);
  return onChange;
};

describe('Select', () => {
  it('shows the current choice', async () => {
    await setup('property');
    expect(screen.getByText('Property')).toBeTruthy();
  });

  it('opens the list, picks an option, reports it and closes', async () => {
    const onChange = await setup();
    await fireEvent.press(screen.getByRole('button', { name: 'Kind' }));
    expect(screen.getByRole('menuitem', { name: 'Property' })).toBeTruthy();
    await fireEvent.press(screen.getByRole('menuitem', { name: 'Property' }));
    expect(onChange).toHaveBeenCalledWith('property');
    expect(screen.queryByRole('menuitem', { name: 'Property' })).toBeNull();
  });

  it('closes without changing anything when dismissed', async () => {
    const onChange = await setup();
    await fireEvent.press(screen.getByRole('button', { name: 'Kind' }));
    await fireEvent.press(screen.getByLabelText('Close'));
    expect(onChange).not.toHaveBeenCalled();
  });
});
