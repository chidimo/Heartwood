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
      <p className="text-ink/70 dark:text-white/70">
        Not allocated yet. It will pass under “everything else”.
      </p>
    );
  }
  const nameOf = (id: string | null, list: { id: string; name: string }[]) =>
    list.find(x => x.id === id)?.name ?? 'someone to be chosen';

  return (
    <ul className="flex flex-col gap-3">
      {allocations.map(a => {
        const person = beneficiaries.find(b => b.id === a.beneficiaryId);
        return (
          <li
            key={a.beneficiaryId}
            className="flex flex-col gap-1 rounded-xl border border-primary-600/20 p-4"
          >
            <p className="font-semibold">{person?.name ?? 'Someone who has been removed'}</p>
            {person && (
              <p className="text-xs text-ink/60 dark:text-white/60">
                {beneficiarySubtitle(person)}
              </p>
            )}
            <p className="text-lg text-primary-700 dark:text-primary-200">
              {a.specificBequest ?? `${a.sharePercent}%`}
            </p>
            {a.condition && (
              <p className="text-sm text-ink/80 dark:text-white/80">
                {conditionSummary(a.condition, {
                  holder: nameOf(a.condition.holderId, executors),
                  fallback: nameOf(a.condition.fallbackBeneficiaryId, beneficiaries),
                })}
              </p>
            )}
          </li>
        );
      })}
    </ul>
  );
};
