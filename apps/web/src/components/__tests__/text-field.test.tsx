import { describe, expect, it } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
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
