import { useId } from 'react';
import { isoFromDate } from '@heartwood/shared';
import { CONTROL, Field } from './field';

interface Props {
  label: string;
  /** "YYYY-MM-DD", or null when no date is set. */
  value: string | null;
  onChange: (value: string | null) => void;
  /** Latest date that can be picked. Defaults to today. */
  maxDate?: Date;
  hint?: string;
}

/** A date chosen with the browser's date picker, never typed in a format someone has to guess. */
export const DateField = ({ label, value, onChange, maxDate = new Date(), hint }: Props) => {
  const id = useId();
  return (
    <Field label={label} htmlFor={id} hint={hint}>
      <input
        id={id}
        type="date"
        className={CONTROL}
        min="1900-01-01"
        max={isoFromDate(maxDate)}
        value={value ?? ''}
        onChange={e => onChange(e.target.value || null)}
      />
    </Field>
  );
};
