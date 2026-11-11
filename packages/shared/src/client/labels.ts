import {
  INSTITUTION_TYPES,
  RELATIONSHIPS,
  type BeneficiaryDto,
  type BeneficiaryKind,
  type ConditionKind,
  type ContingencyPlan,
  type InstitutionType,
  type IfUnmetPlan,
  type InventoryIssue,
  type Relationship,
} from '../inventory';

/** The form's "not decided" choice stands in for a null plan. */
export type ContingencyChoice = ContingencyPlan | 'unset';

export const RELATIONSHIP_LABELS: Record<Relationship, string> = {
  wife: 'Wife',
  husband: 'Husband',
  son: 'Son',
  daughter: 'Daughter',
  stepchild: 'Stepchild',
  father: 'Father',
  mother: 'Mother',
  brother: 'Brother',
  sister: 'Sister',
  grandchild: 'Grandchild',
  grandparent: 'Grandparent',
  uncle: 'Uncle',
  aunt: 'Aunt',
  nephew: 'Nephew',
  niece: 'Niece',
  cousin: 'Cousin',
  in_law: 'In-law',
  friend: 'Friend',
  other: 'Someone else (say how)',
};

export const RELATIONSHIP_OPTIONS = RELATIONSHIPS.map(value => ({
  value,
  label: RELATIONSHIP_LABELS[value],
}));

export const KIND_OPTIONS = [
  { value: 'person', label: 'A person' },
  { value: 'institution', label: 'An organisation' },
] as const satisfies readonly { value: BeneficiaryKind; label: string }[];

export const INSTITUTION_TYPE_LABELS: Record<InstitutionType, string> = {
  church: 'Church',
  mosque: 'Mosque',
  place_of_worship: 'Other place of worship',
  mission: 'Religious mission or order',
  charity: 'Charity',
  foundation: 'Foundation or trust',
  orphanage: 'Orphanage',
  school: 'School',
  university: 'University or college',
  hospital: 'Hospital or clinic',
  community: 'Community or town union',
  association: 'Association or club',
  cooperative: 'Cooperative society',
  other: 'Other organisation',
};

export const INSTITUTION_TYPE_OPTIONS = INSTITUTION_TYPES.map(value => ({
  value,
  label: INSTITUTION_TYPE_LABELS[value],
}));

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

/** A relationship in words: the listed one, or what the testator typed for "other". */
export const relationshipLabel = (
  b: Pick<BeneficiaryDto, 'relationship' | 'relationshipOther'>
) => {
  if (!b.relationship) return '';
  if (b.relationship === 'other') return b.relationshipOther ?? 'Other';
  return RELATIONSHIP_LABELS[b.relationship];
};

/** The line under a name: how a person is related to you, or what kind of organisation it is. */
export const beneficiarySubtitle = (
  b: Pick<BeneficiaryDto, 'relationship' | 'relationshipOther' | 'institutionType'>
) => (b.institutionType ? INSTITUTION_TYPE_LABELS[b.institutionType] : relationshipLabel(b));

export const SEVERITY_LABELS: Record<InventoryIssue['severity'], string> = {
  error: 'Needs fixing',
  warning: 'Worth a look',
  info: 'For your information',
};

export const SEVERITY_ORDER: InventoryIssue['severity'][] = ['error', 'warning', 'info'];

export const CONDITION_KIND_OPTIONS = [
  { value: 'min_age', label: 'They reach an age' },
  { value: 'marriage', label: 'They marry' },
  { value: 'education', label: 'They finish their education' },
  { value: 'nysc', label: 'They complete National Youth Service (NYSC)' },
  { value: 'survives', label: 'They outlive me by a number of days' },
  { value: 'other', label: 'Something else (describe it)' },
] as const satisfies readonly { value: ConditionKind; label: string }[];

/** A line of guidance under the kind, or null. */
export const conditionKindHint = (kind: ConditionKind): string | null => {
  if (kind === 'marriage') {
    return 'Your lawyer will check that this kind of condition is allowed before it goes in your will.';
  }
  if (kind === 'other') return 'Your lawyer will check the wording.';
  return null;
};

/** What the optional free-text note asks for, per kind ("other" has no optional note: its text is the condition). */
export const conditionNoteLabel = (kind: ConditionKind): string => {
  if (kind === 'education') return 'Which course or institution? (optional)';
  if (kind === 'other') return 'What has to happen first?';
  return 'Anything to add, in your own words? (optional)';
};

export const IF_UNMET_OPTIONS = [
  { value: 'redistribute', label: 'Share it among my other beneficiaries' },
  { value: 'named_beneficiary', label: 'Give it to someone I name' },
  { value: 'residuary', label: 'Add it to "everything else"' },
] as const satisfies readonly { value: IfUnmetPlan; label: string }[];

export const EXECUTOR_KIND_OPTIONS = [
  { value: 'executor', label: 'Executor' },
  { value: 'lawyer', label: 'Lawyer' },
  { value: 'priest', label: 'Priest' },
] as const;

const ifUnmetSentence = (plan: IfUnmetPlan, fallbackName: string): string => {
  if (plan === 'named_beneficiary') return `it goes to ${fallbackName}`;
  if (plan === 'residuary') return 'it goes into "everything else"';
  return 'it is shared among my other beneficiaries';
};

/** Either the form's condition (text fields) or a saved one (numbers), so one function reads both. */
interface ConditionLike {
  kind: ConditionKind;
  minAge?: string | number;
  days?: string | number;
  text?: string | null;
  ifUnmet: IfUnmetPlan;
}

const conditionPhrase = (c: ConditionLike): string => {
  if (c.kind === 'min_age') return `Only at age ${c.minAge}`;
  if (c.kind === 'marriage') return 'Only if they marry';
  if (c.kind === 'education') return 'Only when they finish their education';
  if (c.kind === 'nysc') return 'Only when they complete National Youth Service (NYSC)';
  if (c.kind === 'survives') {
    return `Only if they outlive me by ${c.days} ${Number(c.days) === 1 ? 'day' : 'days'}`;
  }
  return `Only when ${(c.text ?? '').trim()}`;
};

/** One plain sentence: "Only at age 25. Held by Barr. Adeyemi. If it is not met, it goes to Chidi Obi." */
export const conditionSummary = (
  c: ConditionLike,
  names: { holder: string; fallback: string }
): string => {
  const note = c.kind !== 'other' && c.text?.trim() ? ` (${c.text.trim()})` : '';
  return `${conditionPhrase(c)}${note}. Held by ${names.holder}. If it is not met, ${ifUnmetSentence(c.ifUnmet, names.fallback)}.`;
};
