import { FlatList, Pressable, Text, View } from 'react-native';
import { useRouter } from 'expo-router';
import type { AssetDto } from '@heartwood/shared';
import { useAuth } from '../../../src/auth/auth-context';
import { Button } from '../../../src/components/button';
import { QueryState } from '../../../src/components/query-state';
import { useAssets } from '../../../src/features/assets/api';
import { ASSET_TYPE_LABELS, formatValue } from '../../../src/features/assets/labels';

const AssetRow = ({ asset, onPress }: { asset: AssetDto; onPress: () => void }) => (
  <Pressable
    accessibilityRole="button"
    onPress={onPress}
    className="rounded-xl border border-primary-600/20 bg-white p-4 dark:bg-primary-900"
  >
    <Text className="text-xs uppercase text-primary-600 dark:text-primary-200">
      {ASSET_TYPE_LABELS[asset.type]}
    </Text>
    <Text className="mt-1 text-base font-medium text-ink dark:text-white">{asset.description}</Text>
    {asset.institution && (
      <Text className="text-ink/60 dark:text-white/60">{asset.institution}</Text>
    )}
    <Text className="mt-1 text-sm text-ink/70 dark:text-white/70">
      {formatValue(asset.roughValue)}
    </Text>
  </Pressable>
);

const AssetsScreen = () => {
  const router = useRouter();
  const { account, signOut } = useAuth();
  const assets = useAssets();

  const handleAdd = () => router.push('/add-asset');

  return (
    <View className="flex-1 bg-white dark:bg-ink">
      <View className="flex-1 gap-4 p-6">
        <Text className="text-ink/70 dark:text-white/70">Signed in as {account?.name}</Text>
        <QueryState
          query={assets}
          isEmpty={list => list.length === 0}
          empty={
            <Text className="py-8 text-center text-ink/60 dark:text-white/60">
              Nothing listed yet. Add the first thing you own.
            </Text>
          }
        >
          {list => (
            <FlatList
              data={list}
              keyExtractor={item => item.id}
              renderItem={({ item }) => (
                <AssetRow asset={item} onPress={() => router.push(`/asset/${item.id}`)} />
              )}
              ItemSeparatorComponent={() => <View className="h-3" />}
            />
          )}
        </QueryState>
      </View>
      <View className="gap-3 px-6 pb-6">
        <Button label="Add an asset" onPress={handleAdd} testID="add-asset" />
        <Pressable onPress={() => void signOut()} accessibilityRole="button">
          <Text className="text-center text-primary-600 dark:text-primary-200">Sign out</Text>
        </Pressable>
      </View>
    </View>
  );
};
export default AssetsScreen;
