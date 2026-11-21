import { useId } from 'react';
import Select from 'react-select';
import { Field } from './field';
import { selectClassNames, selectStyles } from './select-styles';

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
        classNames={selectClassNames<SelectOption<T>>()}
        styles={selectStyles<SelectOption<T>>()}
      />
    </Field>
  );
};
