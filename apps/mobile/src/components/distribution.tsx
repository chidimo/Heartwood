import { Text, View } from 'react-native';
import {
  beneficiarySubtitle,
  conditionSummary,
  type AllocationDto,
  type BeneficiaryDto,
  type ExecutorDto,
} from '@heartwood/shared';

interface Props {
  allocations: AllocationDto[];
  beneficiaries: BeneficiaryDto[];
  executors: ExecutorDto[];
}

/** Read-only: who gets an asset, how much (or what), and any condition, in plain words. */
export const Distribution = ({ allocations, beneficiaries, executors }: Props) => {
  if (allocations.length === 0) {
    return (
      <Text className="text-ink/70 dark:text-white/70">
        Not allocated yet. It will pass under “everything else”.
      </Text>
    );
  }
  const nameOf = (id: string | null, list: { id: string; name: string }[]) =>
    list.find(x => x.id === id)?.name ?? 'someone to be chosen';

  return (
    <View className="gap-3">
      {allocations.map(a => {
        const person = beneficiaries.find(b => b.id === a.beneficiaryId);
        return (
          <View
            key={a.beneficiaryId}
            className="gap-1 rounded-xl border border-primary-600/20 bg-white p-4 dark:bg-primary-900"
          >
            <Text className="text-base font-semibold text-ink dark:text-white">
              {person?.name ?? 'Someone who has been removed'}
            </Text>
            {person && (
              <Text className="text-xs text-ink/60 dark:text-white/60">
                {beneficiarySubtitle(person)}
              </Text>
            )}
            <Text className="text-lg text-primary-700 dark:text-primary-200">
              {a.specificBequest ?? `${a.sharePercent}%`}
            </Text>
            {a.condition && (
              <Text className="text-sm text-ink/80 dark:text-white/80">
                {conditionSummary(a.condition, {
                  holder: nameOf(a.condition.holderId, executors),
                  fallback: nameOf(a.condition.fallbackBeneficiaryId, beneficiaries),
                })}
              </Text>
            )}
          </View>
        );
      })}
    </View>
  );
};
