import type { ReactNode } from 'react';
import { ActivityIndicator, Text, View } from 'react-native';
import type { UseQueryResult } from '@tanstack/react-query';
import { errorMessage } from '../api/client';

interface Props<T> {
  query: UseQueryResult<T>;
  /** With `empty`: shown instead of `children` when this says the data has nothing to show. */
  isEmpty?: (data: T) => boolean;
  empty?: ReactNode;
  children: (data: T) => ReactNode;
}

/** The loading / failed / empty / data switch a screen needs, without nested ternaries. */
export const QueryState = <T,>({ query, isEmpty, empty, children }: Props<T>) => {
  if (query.isPending) {
    return (
      <View className="items-center p-4">
        <ActivityIndicator />
      </View>
    );
  }
  if (query.isError) {
    return (
      <View className="rounded-xl bg-danger/10 p-4">
        <Text className="text-danger">{errorMessage(query.error)}</Text>
      </View>
    );
  }
  if (isEmpty?.(query.data)) return <>{empty}</>;
  return <>{children(query.data)}</>;
};
