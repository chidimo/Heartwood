import type { ButtonHTMLAttributes } from 'react';
import { cn } from '../lib/cn';

interface Props extends Omit<ButtonHTMLAttributes<HTMLButtonElement>, 'type'> {
  variant?: 'primary' | 'secondary' | 'danger-link' | 'link';
  /** Disables the button and shows it is working while a request is in flight. */
  loading?: boolean;
  type?: 'button' | 'submit';
}

const STYLES = {
  primary: 'h-11 rounded-xl bg-primary-600 px-5 font-semibold text-white hover:bg-primary-700',
  secondary:
    'h-11 rounded-xl border border-primary-600/40 px-5 font-semibold text-primary-700 hover:bg-primary-50 dark:text-primary-200 dark:hover:bg-primary-900',
  'danger-link': 'text-danger underline-offset-2 hover:underline',
  link: 'text-primary-600 underline-offset-2 hover:underline dark:text-primary-200',
} as const;

export const Button = ({
  variant = 'primary',
  loading,
  disabled,
  type = 'button',
  className,
  children,
  ...rest
}: Props) => (
  <button
    type={type}
    disabled={disabled || loading}
    aria-busy={loading}
    className={cn(
      STYLES[variant],
      (disabled || loading) && 'cursor-not-allowed opacity-60',
      className
    )}
    {...rest}
  >
    {loading ? 'Working…' : children}
  </button>
);
