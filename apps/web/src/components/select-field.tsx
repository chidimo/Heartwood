import { useId } from 'react';
import Select from 'react-select';
import { cn } from '../lib/cn';
import { Field } from './field';

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

/** A searchable dropdown (react-select, as in Concord). Always holds a value once chosen. */
export const SelectField = <T extends string>({
  label,
  value,
  options,
  onChange,
  hint,
  placeholder = 'Choose…',
}: Props<T>) => {
  const id = useId();
  const selected = options.find(o => o.value === value) ?? null;
  return (
    <Field label={label} htmlFor={id} hint={hint}>
      <Select<SelectOption<T>, false>
        inputId={id}
        unstyled
        options={options}
        value={selected}
        placeholder={placeholder}
        isSearchable={options.length > 6}
        noOptionsMessage={({ inputValue }) => `No match for "${inputValue}"`}
        onChange={option => option && onChange(option.value)}
        classNames={{
          control: state =>
            cn(
              'min-h-11 rounded-xl border bg-white px-3 text-base text-ink dark:bg-primary-900 dark:text-white',
              state.isFocused ? 'border-primary-600' : 'border-primary-600/30'
            ),
          placeholder: () => 'text-ink/50 dark:text-white/50',
          dropdownIndicator: () => 'text-ink/50 dark:text-white/50',
          menu: () =>
            'z-50 mt-1 overflow-hidden rounded-xl border border-primary-600/30 bg-white shadow-lg dark:bg-primary-900',
          option: state =>
            cn(
              'cursor-pointer px-3 py-2 text-base',
              state.isSelected && 'bg-primary-600 text-white',
              !state.isSelected && state.isFocused && 'bg-primary-600/10'
            ),
          noOptionsMessage: () => 'px-3 py-2 text-sm text-ink/60 dark:text-white/60',
        }}
      />
    </Field>
  );
};
