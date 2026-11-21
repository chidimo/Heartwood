import type { ReactNode } from 'react';

interface Props {
  label: string;
  htmlFor: string;
  hint?: string;
  error?: string | null;
  children: ReactNode;
}

/** A label, its control, and the guidance or error under it. */
export const Field = ({ label, htmlFor, hint, error, children }: Props) => (
  <div className="flex flex-col gap-1">
    <label htmlFor={htmlFor} className="text-sm font-medium">
      {label}
    </label>
    {children}
    {hint && !error && <p className="text-xs text-ink/60 dark:text-white/60">{hint}</p>}
    {error && (
      <p role="alert" className="text-xs text-danger">
        {error}
      </p>
    )}
  </div>
);

export const CONTROL =
  'h-11 w-full rounded-xl border border-primary-600/30 bg-white px-3 text-base text-ink focus:border-primary-600 focus:outline-none dark:bg-primary-900 dark:text-white';
