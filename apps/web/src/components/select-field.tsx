import { useId } from 'react';
import { CONTROL, Field } from './field';

export interface SelectOption<T extends string> {
  value: T;
  label: string;
}

interface Props<T extends string> {
  label: string;
  value: T | '';
  options: readonly SelectOption<T>[];
  onChange: (value: T) => void;
  hint?: string;
  /** Shown as the unselected choice when there is no value yet. */
  placeholder?: string;
}

/** A dropdown: the browser's own select, so it works with every keyboard and screen reader. */
export const SelectField = <T extends string>({
  label,
  value,
  options,
  onChange,
  hint,
  placeholder = 'Choose…',
}: Props<T>) => {
  const id = useId();
  return (
    <Field label={label} htmlFor={id} hint={hint}>
      <select
        id={id}
        className={CONTROL}
        value={value}
        onChange={e => onChange(e.target.value as T)}
      >
        {value === '' && (
          <option value="" disabled>
            {placeholder}
          </option>
        )}
        {options.map(o => (
          <option key={o.value} value={o.value}>
            {o.label}
          </option>
        ))}
      </select>
    </Field>
  );
};
