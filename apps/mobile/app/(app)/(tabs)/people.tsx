import { FlatList, Pressable, Text, View } from 'react-native';
import { useRouter } from 'expo-router';
import { Button } from '../../../src/components/button';
import { QueryState } from '../../../src/components/query-state';
import { useBeneficiaries } from '../../../src/features/inventory/api';
import { beneficiarySubtitle, contingencyLabel, contingencyQuestion } from '@heartwood/shared';

const PeopleScreen = () => {
  const router = useRouter();
  const beneficiaries = useBeneficiaries();

  return (
    <View className="flex-1 bg-white dark:bg-ink">
      <View className="flex-1 gap-4 p-6">
        <Text className="text-ink/70 dark:text-white/70">
          The people and organisations you want to leave things to.
        </Text>
        <QueryState
          query={beneficiaries}
          isEmpty={list => list.length === 0}
          empty={
            <Text className="py-8 text-center text-ink/60 dark:text-white/60">
              No one yet. Add the first person or organisation.
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
                  onPress={() => router.push({ pathname: '/beneficiary', params: { id: item.id } })}
                  className="rounded-xl border border-primary-600/20 bg-white p-4 dark:bg-primary-900"
                >
                  <Text className="text-base font-medium text-ink dark:text-white">
                    {item.name}
                  </Text>
                  <Text className="text-ink/60 dark:text-white/60">
                    {beneficiarySubtitle(item)}
                  </Text>
                  <Text className="mt-1 text-xs text-ink/60 dark:text-white/60">
                    {contingencyQuestion(item.kind)}: {contingencyLabel(item)}
                  </Text>
                </Pressable>
              )}
            />
          )}
        </QueryState>
      </View>
      <View className="px-6 pb-6">
        <Button
          label="Add a beneficiary"
          onPress={() => router.push('/beneficiary')}
          testID="add-beneficiary"
        />
      </View>
    </View>
  );
};
export default PeopleScreen;
