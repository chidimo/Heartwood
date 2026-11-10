import {
  allocationProblem,
  residuaryProblem,
  type AllocationDto,
  type AllocationEntry,
  type GiftCondition,
  type IfUnmetPlan,
  type ResiduaryEntry,
} from '../inventory';

// Form state for splitting an asset (or the residuary) between beneficiaries. Percentages are typed as
// text, so parsing and validation live here rather than in the screens.

export type AllocationMode = 'split' | 'bequest';

/** A condition on one person's gift, as typed. Ages are text until they are checked. */
export interface ConditionForm {
  kind: 'min_age' | 'other';
  minAge: string;
  text: string;
  ifUnmet: IfUnmetPlan;
  fallbackId: string;
  holderId: string;
}

export const newCondition = (holderId = ''): ConditionForm => ({
  kind: 'min_age',
  minAge: '',
  text: '',
  ifUnmet: 'redistribute',
  fallbackId: '',
  holderId,
});

export interface AllocationForm {
  mode: AllocationMode;
  /** beneficiary id -> the condition on their gift (absent = no condition) */
  conditions: Record<string, ConditionForm>;
  /** beneficiary id -> percent as typed ("" = not included) */
  shares: Record<string, string>;
  bequestBeneficiaryId: string | null;
  bequestText: string;
}

export const emptyForm: AllocationForm = {
  mode: 'split',
  conditions: {},
  shares: {},
  bequestBeneficiaryId: null,
  bequestText: '',
};

const conditionFormFromApi = (c: GiftCondition): ConditionForm => ({
  kind: c.kind,
  minAge: c.kind === 'min_age' ? String(c.minAge) : '',
  text: c.kind === 'other' ? c.text : '',
  ifUnmet: c.ifUnmet,
  fallbackId: c.fallbackBeneficiaryId ?? '',
  holderId: c.holderId,
});

export const formFromAllocations = (allocations: AllocationDto[]): AllocationForm => {
  const conditions: Record<string, ConditionForm> = {};
  for (const a of allocations) {
    if (a.condition) conditions[a.beneficiaryId] = conditionFormFromApi(a.condition);
  }
  const bequest = allocations.find(a => a.specificBequest !== null);
  if (bequest) {
    return {
      ...emptyForm,
      mode: 'bequest',
      conditions,
      bequestBeneficiaryId: bequest.beneficiaryId,
      bequestText: bequest.specificBequest ?? '',
    };
  }
  const shares: Record<string, string> = {};
  for (const a of allocations) shares[a.beneficiaryId] = String(a.sharePercent);
  return { ...emptyForm, conditions, shares };
};

/** Why a condition can't be saved yet, or null. `personId` is who the gift is for. */
export const conditionProblem = (c: ConditionForm, personId: string): string | null => {
  if (c.kind === 'min_age') {
    const age = Number(c.minAge);
    if (!/^\d{1,3}$/.test(c.minAge.trim()) || age < 1 || age > 100) {
      return 'Enter an age between 1 and 100.';
    }
  } else if (!c.text.trim()) {
    return 'Describe what has to happen first.';
  }
  if (!c.holderId) return 'Choose who will hold it until the condition is met.';
  if (c.ifUnmet === 'named_beneficiary') {
    if (!c.fallbackId) return "Choose who receives it if the condition isn't met.";
    if (c.fallbackId === personId) return "A gift can't fall back to the person it is for.";
  }
  return null;
};

/** The condition as the API wants it. Call only when conditionProblem is null. */
export const conditionToApi = (c: ConditionForm): GiftCondition => {
  const common = {
    ifUnmet: c.ifUnmet,
    fallbackBeneficiaryId: c.ifUnmet === 'named_beneficiary' ? c.fallbackId : null,
    holderId: c.holderId,
  };
  if (c.kind === 'min_age') return { kind: 'min_age', minAge: Number(c.minAge), ...common };
  return { kind: 'other', text: c.text.trim(), ...common };
};

/** "33.5" -> 33.5, "" -> null (not included), "abc" or 33.333 -> NaN (invalid). */
export const parsePercent = (text: string): number | null => {
  const trimmed = text.trim();
  if (trimmed === '') return null;
  if (!/^\d+(\.\d{1,2})?$/.test(trimmed)) return NaN;
  return Number(trimmed);
};

/** Percent shares as the API wants them: only people with a share above zero. */
export const sharesToEntries = (shares: Record<string, string>) => {
  const entries: { beneficiaryId: string; sharePercent: number }[] = [];
  for (const [beneficiaryId, text] of Object.entries(shares)) {
    const value = parsePercent(text);
    if (value !== null && !Number.isNaN(value) && value > 0) {
      entries.push({ beneficiaryId, sharePercent: value });
    }
  }
  return entries;
};

export const hasInvalidText = (shares: Record<string, string>): boolean =>
  Object.values(shares).some(text => Number.isNaN(parsePercent(text)));

/** Total in hundredths of a percent, so 33.33 + 33.33 + 33.34 is exactly 10000. */
export const totalHundredths = (shares: Record<string, string>): number =>
  sharesToEntries(shares).reduce((sum, e) => sum + Math.round(e.sharePercent * 100), 0);

export const formatTotal = (shares: Record<string, string>): string =>
  `${(totalHundredths(shares) / 100).toFixed(2).replace(/\.?0+$/, '')}%`;

const conditionFor = (form: AllocationForm, personId: string): GiftCondition | null => {
  const c = form.conditions[personId];
  return c && conditionProblem(c, personId) === null ? conditionToApi(c) : null;
};

export const toAllocationEntries = (form: AllocationForm): AllocationEntry[] => {
  if (form.mode === 'bequest') {
    if (!form.bequestBeneficiaryId || !form.bequestText.trim()) return [];
    return [
      {
        beneficiaryId: form.bequestBeneficiaryId,
        sharePercent: null,
        specificBequest: form.bequestText.trim(),
        condition: conditionFor(form, form.bequestBeneficiaryId),
      },
    ];
  }
  return sharesToEntries(form.shares).map(e => ({
    ...e,
    specificBequest: null,
    condition: conditionFor(form, e.beneficiaryId),
  }));
};

/** Ids of the people who currently receive something in this form (the only ones a condition can apply to). */
export const recipientIds = (form: AllocationForm): string[] => {
  if (form.mode === 'split') return sharesToEntries(form.shares).map(e => e.beneficiaryId);
  return form.bequestBeneficiaryId ? [form.bequestBeneficiaryId] : [];
};

const incompleteConditionProblem = (form: AllocationForm): string | null => {
  for (const personId of recipientIds(form)) {
    const c = form.conditions[personId];
    const problem = c ? conditionProblem(c, personId) : null;
    if (problem) return `A condition is unfinished. ${problem}`;
  }
  return null;
};

/** Why the form can't be saved yet, or null. An empty form is fine: it clears the allocation. */
export const allocationFormProblem = (form: AllocationForm): string | null => {
  if (form.mode === 'bequest') {
    const started = form.bequestBeneficiaryId !== null || form.bequestText.trim() !== '';
    if (started && (!form.bequestBeneficiaryId || !form.bequestText.trim())) {
      return 'Choose who gets it and describe the gift.';
    }
    return incompleteConditionProblem(form);
  }
  if (hasInvalidText(form.shares)) return 'Use numbers like 50 or 33.33 (up to 2 decimals).';
  const shareProblem = allocationProblem(toAllocationEntries(form));
  return shareProblem ?? incompleteConditionProblem(form);
};

export const toResiduaryEntries = (shares: Record<string, string>): ResiduaryEntry[] =>
  sharesToEntries(shares);

export const residuaryFormProblem = (shares: Record<string, string>): string | null => {
  if (hasInvalidText(shares)) return 'Use numbers like 50 or 33.33 (up to 2 decimals).';
  return residuaryProblem(toResiduaryEntries(shares));
};

/** 100% split across the given people, any leftover hundredths going to the first: 3 -> 33.34, 33.33, 33.33. */
export const splitEvenly = (ids: string[]): Record<string, string> => {
  if (ids.length === 0) return {};
  const each = Math.floor(10000 / ids.length);
  const extra = 10000 - each * ids.length;
  return Object.fromEntries(ids.map((id, i) => [id, String((each + (i < extra ? 1 : 0)) / 100)]));
};
