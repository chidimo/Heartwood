import { useState } from 'react';
import { FlatList, RefreshControl, Text, View } from 'react-native';
import { INSTITUTION_TYPE_OPTIONS, type InstitutionType } from '@heartwood/shared';
import { directorySubtitle } from '../../../src/components/directory-select';
import { ListFooter } from '../../../src/components/list-footer';
import { Select } from '../../../src/components/select';
import { TextField } from '../../../src/components/text-field';
import {
  useOrganizationDirectory,
  useOrganizationStates,
} from '../../../src/features/inventory/api';
import { useDebouncedValue } from '../../../src/utils/use-debounced-value';

const ALL = 'all';

const KIND_FILTER = [
  { value: ALL, label: 'All kinds' },
  ...INSTITUTION_TYPE_OPTIONS.map(o => ({ value: o.value as string, label: o.label })),
];

/** Browse the premade list of organisations. Read-only: people pick from it when adding a beneficiary. */
const OrganizationsScreen = () => {
  const [search, setSearch] = useState('');
  const [kind, setKind] = useState(ALL);
  const [state, setState] = useState(ALL);
  const states = useOrganizationStates();

  const results = useOrganizationDirectory({
    q: useDebouncedValue(search),
    type: kind === ALL ? undefined : (kind as InstitutionType),
    state: state === ALL ? undefined : state,
  });

  const stateOptions = [
    { value: ALL, label: 'All states' },
    ...(states.data ?? []).map(s => ({ value: s, label: s })),
  ];

  return (
    <View className="flex-1 gap-4 bg-white p-6 dark:bg-ink">
      <TextField
        label="Search"
        value={search}
        onChangeText={setSearch}
        autoCapitalize="none"
        autoCorrect={false}
      />
      <View className="flex-row gap-3">
        <View className="flex-1">
          <Select label="Kind" value={kind} options={KIND_FILTER} onChange={setKind} />
        </View>
        <View className="flex-1">
          <Select label="State" value={state} options={stateOptions} onChange={setState} />
        </View>
      </View>
      <Text className="text-sm text-ink/60 dark:text-white/60">
        {results.total} {results.total === 1 ? 'organisation' : 'organisations'}
      </Text>
      <FlatList
        data={results.items}
        keyExtractor={entry => entry.id}
        ItemSeparatorComponent={() => <View className="h-3" />}
        onEndReached={() => {
          if (results.hasNextPage && !results.isFetchingNextPage) results.fetchNextPage();
        }}
        onEndReachedThreshold={0.5}
        refreshControl={
          <RefreshControl
            refreshing={results.isRefetching && !results.isFetchingNextPage}
            onRefresh={results.refetch}
          />
        }
        ListEmptyComponent={
          <Text className="py-8 text-center text-ink/60 dark:text-white/60">
            {results.isPending
              ? 'Loading…'
              : 'Nothing matches. You can still enter an organisation yourself when you add a beneficiary.'}
          </Text>
        }
        ListFooterComponent={<ListFooter isFetchingNextPage={results.isFetchingNextPage} />}
        renderItem={({ item }) => (
          <View className="rounded-xl border border-primary-600/20 bg-white p-4 dark:bg-primary-900">
            <Text className="text-base font-medium text-ink dark:text-white">{item.name}</Text>
            <Text className="text-ink/60 dark:text-white/60">{directorySubtitle(item)}</Text>
          </View>
        )}
      />
    </View>
  );
};
export default OrganizationsScreen;
