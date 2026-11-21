import { cleanAmountInput, padAmountInput } from '@heartwood/shared';
import { TextField } from './text-field';

interface Props {
  label: string;
  value: string;
  onChange: (value: string) => void;
  hint?: string;
}

/** Naira amount: commas as you type, two decimals once you leave the field. */
export const AmountField = ({ label, value, onChange, hint }: Props) => (
  <TextField
    label={label}
    value={value}
    onChange={text => onChange(cleanAmountInput(text))}
    onBlur={() => onChange(padAmountInput(value))}
    inputMode="decimal"
    hint={hint}
  />
);
