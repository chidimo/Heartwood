import { ActivityIndicator, View } from 'react-native';

/** The strip under an infinite list: a spinner while the next page loads. */
export const ListFooter = ({ isFetchingNextPage }: { isFetchingNextPage: boolean }) => (
  <View className="h-12 items-center justify-center">
    {isFetchingNextPage && <ActivityIndicator />}
  </View>
);
