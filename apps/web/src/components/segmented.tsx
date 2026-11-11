import { cn } from '../lib/cn';

interface Props<T extends string> {
  value: T;
  options: readonly { value: T; label: string }[];
  onChange: (value: T) => void;
  label: string;
}

/** A short row of mutually exclusive choices (two or three). For longer lists use SelectField. */
export const Segmented = <T extends string>({ value, options, onChange, label }: Props<T>) => (
  <div role="group" aria-label={label} className="flex rounded-xl border border-primary-600/30 p-1">
    {options.map(option => (
      <button
        key={option.value}
        type="button"
        aria-pressed={option.value === value}
        onClick={() => onChange(option.value)}
        className={cn(
          'flex-1 rounded-lg px-3 py-2 text-sm font-medium',
          option.value === value
            ? 'bg-primary-600 text-white'
            : 'hover:bg-primary-50 dark:hover:bg-primary-900'
        )}
      >
        {option.label}
      </button>
    ))}
  </div>
);
