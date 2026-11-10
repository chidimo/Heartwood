import { useState } from 'react';
import { Pressable, Text } from 'react-native';
import { useRouter } from 'expo-router';
import {
  type BeneficiaryDto,
  residuaryFormProblem,
  splitEvenly,
  toResiduaryEntries,
} from '@heartwood/shared';
import { errorMessage } from '../../src/api/client';
import { Button } from '../../src/components/button';
import { QueryState } from '../../src/components/query-state';
import { Screen } from '../../src/components/screen';
import { SharesEditor } from '../../src/components/shares-editor';
import {
  useBeneficiaries,
  useReplaceResiduary,
  useResiduary,
} from '../../src/features/inventory/api';
import { notify } from '../../src/notifications/notify';

const ResiduaryEditor = ({
  beneficiaries,
  initial,
}: {
  beneficiaries: BeneficiaryDto[];
  initial: Record<string, string>;
}) => {
  const router = useRouter();
  const save = useReplaceResiduary();
  const [shares, setShares] = useState(initial);

  const problem = residuaryFormProblem(shares);

  const handleSave = () =>
    save.mutate(toResiduaryEntries(shares), {
      onSuccess: () => {
        notify.success('Saved');
        router.back();
      },
      onError: error => notify.error("Couldn't save", errorMessage(error, 'Try again.')),
    });

  return (
    <Screen>
      <Text className="text-ink/70 dark:text-white/70">
        Anything you haven't given to someone in particular, or forget to list, goes to these
        people.
      </Text>
      <SharesEditor beneficiaries={beneficiaries} shares={shares} onChange={setShares} />
      <Pressable
        onPress={() => setShares(splitEvenly(beneficiaries.map(b => b.id)))}
        accessibilityRole="button"
      >
        <Text className="text-primary-600 dark:text-primary-200">Split evenly</Text>
      </Pressable>
      {problem && <Text className="text-sm text-danger">{problem}</Text>}
      <Button
        label="Save"
        onPress={handleSave}
        loading={save.isPending}
        disabled={problem !== null}
        testID="save-residuary"
      />
    </Screen>
  );
};

const NoBeneficiaries = () => (
  <Screen>
    <Text className="text-ink/70 dark:text-white/70">
      Add a beneficiary on the People tab first.
    </Text>
  </Screen>
);

const ResiduaryScreen = () => {
  const beneficiaries = useBeneficiaries();
  const residuary = useResiduary();

  return (
    <QueryState query={beneficiaries}>
      {people => (
        <QueryState query={residuary}>
          {current => {
            if (people.length === 0) return <NoBeneficiaries />;
            const initial = Object.fromEntries(
              current.map(r => [r.beneficiaryId, String(r.sharePercent)])
            );
            return (
              <ResiduaryEditor
                key={JSON.stringify(current)}
                beneficiaries={people}
                initial={initial}
              />
            );
          }}
        </QueryState>
      )}
    </QueryState>
  );
};
export default ResiduaryScreen;
