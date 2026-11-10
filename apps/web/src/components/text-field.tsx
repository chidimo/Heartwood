import { useId } from 'react';
import type { InputHTMLAttributes } from 'react';
import { cn } from '../lib/cn';
import { CONTROL, Field } from './field';

interface Props extends Omit<InputHTMLAttributes<HTMLInputElement>, 'onChange' | 'value'> {
  label: string;
  value: string;
  onChange: (value: string) => void;
  hint?: string;
  error?: string | null;
  /** A multi-line box instead of a single line. */
  multiline?: boolean;
}

export const TextField = ({
  label,
  value,
  onChange,
  hint,
  error,
  multiline,
  className,
  ...rest
}: Props) => {
  const id = useId();
  const classes = cn(CONTROL, error && 'border-danger', multiline && 'h-24 py-2', className);
  return (
    <Field label={label} htmlFor={id} hint={hint} error={error}>
      {multiline ? (
        <textarea
          id={id}
          className={classes}
          value={value}
          onChange={e => onChange(e.target.value)}
        />
      ) : (
        <input
          id={id}
          className={classes}
          value={value}
          onChange={e => onChange(e.target.value)}
          {...rest}
        />
      )}
    </Field>
  );
};
