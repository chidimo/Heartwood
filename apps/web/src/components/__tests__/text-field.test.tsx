import { describe, expect, it } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { useState } from 'react';
import { AmountField } from '../amount-field';
import { TextField } from '../text-field';

describe('TextField password', () => {
  it('hides the value until Show is pressed', async () => {
    render(<TextField label="Password" type="password" value="secret" onChange={() => {}} />);
    const input = screen.getByLabelText('Password');
    expect(input).toHaveAttribute('type', 'password');
    await userEvent.click(screen.getByRole('button', { name: 'Show' }));
    expect(input).toHaveAttribute('type', 'text');
    await userEvent.click(screen.getByRole('button', { name: 'Hide' }));
    expect(input).toHaveAttribute('type', 'password');
  });

  it('has no toggle on other fields', () => {
    render(<TextField label="Email" value="" onChange={() => {}} />);
    expect(screen.queryByRole('button')).toBeNull();
  });
});

const Amount = () => {
  const [value, setValue] = useState('');
  return <AmountField label="Amount" value={value} onChange={setValue} />;
};

describe('AmountField', () => {
  it('groups thousands while typing and pads to two decimals on blur', async () => {
    render(<Amount />);
    const input = screen.getByLabelText('Amount');
    await userEvent.type(input, '1250.5');
    expect(input).toHaveValue('1,250.5');
    await userEvent.tab();
    expect(input).toHaveValue('1,250.50');
  });

  it('ignores letters and a third decimal', async () => {
    render(<Amount />);
    const input = screen.getByLabelText('Amount');
    await userEvent.type(input, 'ab12.345');
    expect(input).toHaveValue('12.34');
  });
});
