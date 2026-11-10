import { fireEvent, render, screen } from '@testing-library/react-native';
import type { AssetDto } from '@heartwood/shared';
import { AssetForm } from '../asset-form';

const FLAT: AssetDto = {
  id: 'a1',
  type: 'property',
  description: '3-bedroom flat',
  institution: 'Lagos State Land Registry',
  roughValue: 45000000,
  notes: 'Title deed is with the family lawyer',
  createdAt: '',
  updatedAt: '',
};

describe('AssetForm', () => {
  it('starts with the existing asset, including its notes', async () => {
    await render(
      <AssetForm
        existing={FLAT}
        submitLabel="Save changes"
        isPending={false}
        onSubmit={jest.fn()}
      />
    );
    expect(screen.getByDisplayValue('Title deed is with the family lawyer')).toBeTruthy();
    expect(screen.getByDisplayValue('45000000')).toBeTruthy();
  });

  it('sends the edited notes with the rest unchanged', async () => {
    const onSubmit = jest.fn();
    await render(
      <AssetForm existing={FLAT} submitLabel="Save changes" isPending={false} onSubmit={onSubmit} />
    );
    await fireEvent.changeText(
      screen.getByDisplayValue('Title deed is with the family lawyer'),
      'Deed is in the safe'
    );
    await fireEvent.press(screen.getByText('Save changes'));
    expect(onSubmit).toHaveBeenCalledWith({
      type: 'property',
      description: '3-bedroom flat',
      institution: 'Lagos State Land Registry',
      roughValue: 45000000,
      notes: 'Deed is in the safe',
    });
  });

  it('cannot be saved without a description', async () => {
    await render(<AssetForm submitLabel="Save asset" isPending={false} onSubmit={jest.fn()} />);
    expect(
      screen.getByRole('button', { name: 'Save asset' }).props.accessibilityState.disabled
    ).toBe(true);
  });
});
