import { describe, expect, it } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { SelectField } from '../select-field';

const OPTIONS = [
  { value: 'cash', label: 'Cash and bank' },
  { value: 'property', label: 'Property' },
] as const;

describe('SelectField menu stacking', () => {
  it('opens its menu above a sticky table header, which sits at z-index 1', async () => {
    render(<SelectField label="Type" value="" options={OPTIONS} onChange={() => {}} />);
    await userEvent.click(screen.getByLabelText('Type'));
    const menu = screen.getByText('Cash and bank').closest('.shadow-lg');
    expect(menu).not.toBeNull();
    expect(Number(getComputedStyle(menu as Element).zIndex)).toBeGreaterThan(1);
  });
});
