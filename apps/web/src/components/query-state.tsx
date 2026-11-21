import type { ReactNode } from 'react';
import type { UseQueryResult } from '@tanstack/react-query';
import { getErrorMessage } from '../api/client';

interface Props<T> {
  query: UseQueryResult<T>;
  /** With `empty`: shown instead of `children` when this says the data has nothing to show. */
  isEmpty?: (data: T) => boolean;
  empty?: ReactNode;
  children: (data: T) => ReactNode;
}

/** The loading / failed / empty / data switch a page needs, without nested ternaries. */
export const QueryState = <T,>({ query, isEmpty, empty, children }: Props<T>) => {
  if (query.isPending) {
    return (
      <p role="status" className="py-6 text-ink/60 dark:text-white/60">
        Loading…
      </p>
    );
  }
  if (query.isError) {
    return (
      <p role="alert" className="rounded-xl bg-danger/10 p-4 text-danger">
        {getErrorMessage(query.error)}
      </p>
    );
  }
  if (isEmpty?.(query.data)) return <>{empty}</>;
  return <>{children(query.data)}</>;
};
