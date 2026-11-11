import type { ClassNamesConfig, GroupBase } from 'react-select';
import { cn } from '../lib/cn';

/** Tailwind classes for react-select (used with `unstyled`), shared by every dropdown. */
export const selectClassNames = <T>(): ClassNamesConfig<T, false, GroupBase<T>> => ({
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
  loadingMessage: () => 'px-3 py-2 text-sm text-ink/60 dark:text-white/60',
});
