import { useState } from 'react';
import { SectionList, Pressable, Text, View } from 'react-native';
import { useRouter } from 'expo-router';
import {
  beneficiarySubtitle,
  contingencyLabel,
  contingencyQuestion,
  type BeneficiaryDto,
} from '@heartwood/shared';
import { Button } from '../../../src/components/button';
import { ChoiceSheet } from '../../../src/components/choice-sheet';
import { QueryState } from '../../../src/components/query-state';
import { useBeneficiaries } from '../../../src/features/inventory/api';

const sectionsOf = (all: BeneficiaryDto[]) =>
  [
    { title: 'People', data: all.filter(b => b.kind === 'person') },
    { title: 'Organisations', data: all.filter(b => b.kind === 'institution') },
  ].filter(section => section.data.length > 0);

const BeneficiariesScreen = () => {
  const router = useRouter();
  const beneficiaries = useBeneficiaries();
  const [isChoosing, setIsChoosing] = useState(false);

  const handleAdd = (kind: 'person' | 'institution') => {
    setIsChoosing(false);
    router.push({ pathname: '/beneficiary', params: { kind } });
  };

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
            <SectionList
              sections={sectionsOf(list)}
              keyExtractor={item => item.id}
              stickySectionHeadersEnabled={false}
              ItemSeparatorComponent={() => <View className="h-3" />}
              renderSectionHeader={({ section }) => (
                <Text className="pb-2 pt-4 text-lg font-semibold text-ink dark:text-white">
                  {section.title}
                </Text>
              )}
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
          onPress={() => setIsChoosing(true)}
          testID="add-beneficiary"
        />
      </View>
      <ChoiceSheet
        visible={isChoosing}
        title="Who are you adding?"
        onClose={() => setIsChoosing(false)}
        choices={[
          { label: 'A person', onPress: () => handleAdd('person'), testID: 'add-person' },
          {
            label: 'An organisation',
            onPress: () => handleAdd('institution'),
            testID: 'add-organisation',
          },
        ]}
      />
    </View>
  );
};
export default BeneficiariesScreen;
