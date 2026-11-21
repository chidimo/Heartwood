import { useId, useState } from 'react';
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
  const [revealed, setRevealed] = useState(false);
  const isPassword = rest.type === 'password';
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
        <div className="relative">
          <input
            id={id}
            className={cn(classes, isPassword && 'pr-16')}
            value={value}
            onChange={e => onChange(e.target.value)}
            {...rest}
            type={isPassword && revealed ? 'text' : rest.type}
          />
          {isPassword && (
            <button
              type="button"
              aria-pressed={revealed}
              onClick={() => setRevealed(!revealed)}
              className="absolute inset-y-0 right-3 text-sm font-medium text-primary-700"
            >
              {revealed ? 'Hide' : 'Show'}
            </button>
          )}
        </div>
      )}
    </Field>
  );
};
