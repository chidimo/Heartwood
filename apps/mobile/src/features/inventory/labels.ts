import type { BeneficiaryDto, ContingencyPlan, InventoryIssue } from '@heartwood/shared';

/** The form's "not decided" choice stands in for a null plan. */
export type ContingencyChoice = ContingencyPlan | 'unset';

export const CONTINGENCY_OPTIONS = [
  { value: 'unset', label: 'Not decided yet' },
  { value: 'redistribute', label: 'Share it among my other beneficiaries' },
  { value: 'pass_to_descendants', label: 'Pass it to their children' },
  { value: 'named_beneficiary', label: 'Give it to someone I name' },
] as const;

export const contingencyLabel = (b: BeneficiaryDto): string =>
  CONTINGENCY_OPTIONS.find(o => o.value === (b.contingencyPlan ?? 'unset'))?.label ?? '';

export const SEVERITY_LABELS: Record<InventoryIssue['severity'], string> = {
  error: 'Needs fixing',
  warning: 'Worth a look',
  info: 'For your information',
};

export const SEVERITY_ORDER: InventoryIssue['severity'][] = ['error', 'warning', 'info'];
