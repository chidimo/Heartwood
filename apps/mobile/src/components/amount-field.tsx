import { cleanAmountInput, padAmountInput } from '@heartwood/shared';
import { TextField } from './text-field';

interface Props {
  label: string;
  value: string;
  onChangeText: (value: string) => void;
  hint?: string;
}

/** Naira amount: commas as you type, two decimals once you leave the field. */
export const AmountField = ({ label, value, onChangeText, hint }: Props) => (
  <TextField
    label={label}
    value={value}
    onChangeText={text => onChangeText(cleanAmountInput(text))}
    onBlur={() => onChangeText(padAmountInput(value))}
    keyboardType="decimal-pad"
    hint={hint}
  />
);
