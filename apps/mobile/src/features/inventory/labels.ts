import type {
  BeneficiaryDto,
  BeneficiaryKind,
  ContingencyPlan,
  InstitutionType,
  InventoryIssue,
} from '@heartwood/shared';

/** The form's "not decided" choice stands in for a null plan. */
export type ContingencyChoice = ContingencyPlan | 'unset';

export const KIND_OPTIONS = [
  { value: 'person', label: 'A person' },
  { value: 'institution', label: 'An organisation' },
] as const satisfies readonly { value: BeneficiaryKind; label: string }[];

export const INSTITUTION_TYPE_LABELS: Record<InstitutionType, string> = {
  church: 'Church',
  mosque: 'Mosque',
  charity: 'Charity',
  school: 'School',
  orphanage: 'Orphanage',
  other: 'Other organisation',
};

export const INSTITUTION_TYPE_OPTIONS = (
  Object.keys(INSTITUTION_TYPE_LABELS) as InstitutionType[]
).map(value => ({ value, label: INSTITUTION_TYPE_LABELS[value] }));

const ALL_CONTINGENCY_OPTIONS = [
  { value: 'unset', label: 'Not decided yet' },
  { value: 'redistribute', label: 'Share it among my other beneficiaries' },
  { value: 'pass_to_descendants', label: 'Pass it to their children' },
  { value: 'named_beneficiary', label: 'Give it to someone I name' },
] as const satisfies readonly { value: ContingencyChoice; label: string }[];

/** An organisation has no children, so "pass it to their children" is not offered. */
export const contingencyOptionsFor = (kind: BeneficiaryKind) =>
  kind === 'institution'
    ? ALL_CONTINGENCY_OPTIONS.filter(o => o.value !== 'pass_to_descendants')
    : ALL_CONTINGENCY_OPTIONS;

export const contingencyQuestion = (kind: BeneficiaryKind): string =>
  kind === 'institution' ? 'If it no longer exists' : 'If they die before you';

export const contingencyLabel = (b: BeneficiaryDto): string =>
  ALL_CONTINGENCY_OPTIONS.find(o => o.value === (b.contingencyPlan ?? 'unset'))?.label ?? '';

/** The line under a name: how a person is related to you, or what kind of organisation it is. */
export const beneficiarySubtitle = (b: Pick<BeneficiaryDto, 'relationship' | 'institutionType'>) =>
  b.institutionType ? INSTITUTION_TYPE_LABELS[b.institutionType] : (b.relationship ?? '');

export const SEVERITY_LABELS: Record<InventoryIssue['severity'], string> = {
  error: 'Needs fixing',
  warning: 'Worth a look',
  info: 'For your information',
};

export const SEVERITY_ORDER: InventoryIssue['severity'][] = ['error', 'warning', 'info'];
