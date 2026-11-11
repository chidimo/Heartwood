import { useState } from 'react';
import { FlatList, Pressable, RefreshControl, Text, View } from 'react-native';
import { useRouter } from 'expo-router';
import {
  ASSET_TYPE_LABELS,
  ASSET_TYPES,
  CURRENCIES,
  CURRENCY_LABELS,
  formatValue,
  type AssetDto,
  type AssetType,
  type Currency,
} from '@heartwood/shared';
import { errorMessage } from '../../../src/api/client';
import { Button } from '../../../src/components/button';
import { ListFooter } from '../../../src/components/list-footer';
import { Select } from '../../../src/components/select';
import { TextField } from '../../../src/components/text-field';
import { useAssets } from '../../../src/features/assets/api';
import { useDebouncedValue } from '../../../src/utils/use-debounced-value';

const ALL = 'all';

const TYPE_FILTER = [
  { value: ALL, label: 'All types' },
  ...ASSET_TYPES.map(value => ({ value: value as string, label: ASSET_TYPE_LABELS[value] })),
];
const CURRENCY_FILTER = [
  { value: ALL, label: 'All currencies' },
  ...CURRENCIES.map(value => ({ value: value as string, label: CURRENCY_LABELS[value] })),
];

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
      {formatValue(asset.roughValue, asset.currency)}
    </Text>
  </Pressable>
);

const AssetsScreen = () => {
  const router = useRouter();
  const [search, setSearch] = useState('');
  const [type, setType] = useState(ALL);
  const [currency, setCurrency] = useState(ALL);

  const assets = useAssets({
    q: useDebouncedValue(search),
    type: type === ALL ? undefined : (type as AssetType),
    currency: currency === ALL ? undefined : (currency as Currency),
  });
  const isFiltered = search.trim() !== '' || type !== ALL || currency !== ALL;

  const handleClear = () => {
    setSearch('');
    setType(ALL);
    setCurrency(ALL);
  };

  const emptyText = () => {
    if (assets.isPending) return 'Loading…';
    if (assets.error) return errorMessage(assets.error);
    if (isFiltered) return 'No assets match. Clear the search or the filters.';
    return 'Nothing listed yet. Add the first thing you own.';
  };

  return (
    <View className="flex-1 bg-white dark:bg-ink">
      <View className="flex-1 gap-4 p-6">
        <TextField
          label="Search"
          value={search}
          onChangeText={setSearch}
          autoCapitalize="none"
          autoCorrect={false}
        />
        <View className="flex-row gap-3">
          <View className="flex-1">
            <Select label="Type" value={type} options={TYPE_FILTER} onChange={setType} />
          </View>
          <View className="flex-1">
            <Select
              label="Currency"
              value={currency}
              options={CURRENCY_FILTER}
              onChange={setCurrency}
            />
          </View>
        </View>
        <View className="flex-row items-center justify-between">
          <Text className="text-sm text-ink/60 dark:text-white/60">
            {assets.total} {assets.total === 1 ? 'asset' : 'assets'}
          </Text>
          {isFiltered && (
            <Pressable onPress={handleClear} accessibilityRole="button">
              <Text className="text-sm text-primary-600 dark:text-primary-200">
                Clear search and filters
              </Text>
            </Pressable>
          )}
        </View>
        <FlatList
          data={assets.items}
          keyExtractor={item => item.id}
          keyboardShouldPersistTaps="handled"
          renderItem={({ item }) => (
            <AssetRow asset={item} onPress={() => router.push(`/asset/${item.id}`)} />
          )}
          ItemSeparatorComponent={() => <View className="h-3" />}
          onEndReached={() => {
            if (assets.hasNextPage && !assets.isFetchingNextPage) assets.fetchNextPage();
          }}
          onEndReachedThreshold={0.5}
          refreshControl={
            <RefreshControl
              refreshing={assets.isRefetching && !assets.isFetchingNextPage}
              onRefresh={assets.refetch}
            />
          }
          ListEmptyComponent={
            <Text className="py-8 text-center text-ink/60 dark:text-white/60">{emptyText()}</Text>
          }
          ListFooterComponent={<ListFooter isFetchingNextPage={assets.isFetchingNextPage} />}
        />
      </View>
      <View className="px-6 pb-6">
        <Button label="Add an asset" onPress={() => router.push('/add-asset')} testID="add-asset" />
      </View>
    </View>
  );
};
export default AssetsScreen;
