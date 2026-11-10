import { useState } from 'react';
import { formatDateInput, parseDateInput } from '../utils/date';
import { TextField } from './text-field';

interface Props {
  label: string;
  value: string | null;
  onChange: (value: string | null) => void;
  initialDate?: string;
  maxDate?: Date;
  hint?: string;
  testID?: string;
}

/** The web build has no native picker, so a date is typed as DD/MM/YYYY (local development only). */
export const DateField = ({ label, value, onChange, hint }: Props) => {
  const [text, setText] = useState(value ? formatDateInput(value) : '');
  const invalid = text.trim() !== '' && parseDateInput(text) === null;

  const handleChange = (next: string) => {
    setText(next);
    onChange(next.trim() ? parseDateInput(next) : null);
  };

  return (
    <TextField
      label={label}
      value={text}
      onChangeText={handleChange}
      placeholder="DD/MM/YYYY"
      keyboardType="numbers-and-punctuation"
      hint={hint}
      error={invalid ? 'Use DD/MM/YYYY, for example 15/06/2012.' : null}
    />
  );
};
