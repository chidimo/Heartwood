import { useState } from 'react';
import { FlatList, Modal, Pressable, Text, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { INSTITUTION_TYPE_OPTIONS, type DirectoryEntry } from '@heartwood/shared';
import { useOrganizationDirectory } from '../features/inventory/api';
import { ListFooter } from './list-footer';
import { useDebouncedValue } from '../utils/use-debounced-value';

export const directorySubtitle = (entry: DirectoryEntry): string => {
  const kind =
    INSTITUTION_TYPE_OPTIONS.find(o => o.value === entry.institutionType)?.label ??
    entry.institutionType;
  const place = [entry.city, entry.state].filter(Boolean).join(', ');
  return [kind, place].filter(Boolean).join(' · ');
};

interface Props {
  value: DirectoryEntry | null;
  onPick: (entry: DirectoryEntry) => void;
  testID?: string;
}

/** A field that opens a searchable sheet of our premade organisations (searched on the server). */
export const DirectorySelect = ({ value, onPick, testID }: Props) => {
  const [open, setOpen] = useState(false);
  const [text, setText] = useState('');
  const results = useOrganizationDirectory({ q: useDebouncedValue(text) });

  const handleClose = () => setOpen(false);
  const handlePick = (entry: DirectoryEntry) => {
    onPick(entry);
    setText('');
    setOpen(false);
  };

  return (
    <View className="gap-1">
      <Text className="text-sm font-medium text-ink dark:text-white">Choose from our list</Text>
      <Pressable
        testID={testID}
        accessibilityRole="button"
        accessibilityLabel="Choose from our list"
        accessibilityValue={{ text: value?.name }}
        onPress={() => setOpen(true)}
        className="h-12 flex-row items-center justify-between rounded-xl border border-primary-600/30 bg-white px-4 dark:bg-primary-900"
      >
        <Text className="text-base text-ink dark:text-white">
          {value?.name ?? 'Search by name…'}
        </Text>
        <Text className="text-ink/60 dark:text-white/60">▾</Text>
      </Pressable>
      <Text className="text-xs text-ink/60 dark:text-white/60">
        Missions, mission hospitals, schools and more. Not there? Enter it yourself.
      </Text>

      <Modal visible={open} animationType="slide" transparent onRequestClose={handleClose}>
        <Pressable
          accessibilityLabel="Close"
          className="flex-1 bg-black/40"
          onPress={handleClose}
        />
        <SafeAreaView
          edges={['bottom']}
          style={{ height: '75%' }}
          className="rounded-t-2xl bg-white dark:bg-primary-900"
        >
          <View className="p-4">
            <TextInput
              accessibilityLabel="Search our list"
              autoFocus
              value={text}
              onChangeText={setText}
              placeholder="Search by name…"
              placeholderTextColor="#8a948d"
              className="h-12 rounded-xl border border-primary-600/30 bg-white px-4 text-base text-ink dark:bg-primary-900 dark:text-white"
            />
          </View>
          <FlatList
            data={results.items}
            keyExtractor={entry => entry.id}
            keyboardShouldPersistTaps="handled"
            onEndReached={() => {
              if (results.hasNextPage && !results.isFetchingNextPage) results.fetchNextPage();
            }}
            onEndReachedThreshold={0.5}
            ListFooterComponent={<ListFooter isFetchingNextPage={results.isFetchingNextPage} />}
            ListEmptyComponent={
              <Text className="px-6 py-4 text-ink/60 dark:text-white/60">
                {results.isPending ? 'Searching…' : 'Not in our list. Enter it yourself instead.'}
              </Text>
            }
            renderItem={({ item }) => (
              <Pressable
                accessibilityRole="menuitem"
                onPress={() => handlePick(item)}
                className="px-6 py-3"
              >
                <Text className="text-base text-ink dark:text-white">{item.name}</Text>
                <Text className="text-xs text-ink/60 dark:text-white/60">
                  {directorySubtitle(item)}
                </Text>
              </Pressable>
            )}
          />
        </SafeAreaView>
      </Modal>
    </View>
  );
};
