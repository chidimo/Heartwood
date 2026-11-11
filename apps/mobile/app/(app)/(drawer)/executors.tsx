import { FlatList, Pressable, Text, View } from 'react-native';
import { useRouter } from 'expo-router';
import { Button } from '../../../src/components/button';
import { QueryState } from '../../../src/components/query-state';
import { useExecutors } from '../../../src/features/inventory/api';
import { EXECUTOR_KIND_OPTIONS } from '@heartwood/shared';

const kindLabel = (kind: string) =>
  EXECUTOR_KIND_OPTIONS.find(o => o.value === kind)?.label ?? kind;

const ExecutorsScreen = () => {
  const router = useRouter();
  const executors = useExecutors();

  return (
    <View className="flex-1 bg-white dark:bg-ink">
      <View className="flex-1 gap-4 p-6">
        <Text className="text-ink/70 dark:text-white/70">
          The people who carry out your will, and who can hold a gift until a condition is met.
        </Text>
        <QueryState
          query={executors}
          isEmpty={list => list.length === 0}
          empty={
            <Text className="py-8 text-center text-ink/60 dark:text-white/60">
              No one yet. Add your executor or your lawyer.
            </Text>
          }
        >
          {list => (
            <FlatList
              data={list}
              keyExtractor={item => item.id}
              ItemSeparatorComponent={() => <View className="h-3" />}
              renderItem={({ item }) => (
                <Pressable
                  accessibilityRole="button"
                  onPress={() => router.push({ pathname: '/executor', params: { id: item.id } })}
                  className="rounded-xl border border-primary-600/20 bg-white p-4 dark:bg-primary-900"
                >
                  <Text className="text-base font-medium text-ink dark:text-white">
                    {item.name}
                  </Text>
                  <Text className="text-ink/60 dark:text-white/60">{kindLabel(item.kind)}</Text>
                  {item.contact && (
                    <Text className="text-xs text-ink/60 dark:text-white/60">{item.contact}</Text>
                  )}
                </Pressable>
              )}
            />
          )}
        </QueryState>
      </View>
      <View className="px-6 pb-6">
        <Button
          label="Add an executor or lawyer"
          onPress={() => router.push('/executor')}
          testID="add-executor"
        />
      </View>
    </View>
  );
};
export default ExecutorsScreen;
