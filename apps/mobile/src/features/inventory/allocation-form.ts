import {
  allocationProblem,
  residuaryProblem,
  type AllocationDto,
  type AllocationEntry,
  type ResiduaryEntry,
} from '@heartwood/shared';

// Form state for splitting an asset (or the residuary) between beneficiaries. Percentages are typed as
// text, so parsing and validation live here rather than in the screens.

export type AllocationMode = 'split' | 'bequest';

export interface AllocationForm {
  mode: AllocationMode;
  /** beneficiary id -> percent as typed ("" = not included) */
  shares: Record<string, string>;
  bequestBeneficiaryId: string | null;
  bequestText: string;
}

export const emptyForm: AllocationForm = {
  mode: 'split',
  shares: {},
  bequestBeneficiaryId: null,
  bequestText: '',
};

export const formFromAllocations = (allocations: AllocationDto[]): AllocationForm => {
  const bequest = allocations.find(a => a.specificBequest !== null);
  if (bequest) {
    return {
      ...emptyForm,
      mode: 'bequest',
      bequestBeneficiaryId: bequest.beneficiaryId,
      bequestText: bequest.specificBequest ?? '',
    };
  }
  const shares: Record<string, string> = {};
  for (const a of allocations) shares[a.beneficiaryId] = String(a.sharePercent);
  return { ...emptyForm, shares };
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

export const toAllocationEntries = (form: AllocationForm): AllocationEntry[] => {
  if (form.mode === 'bequest') {
    if (!form.bequestBeneficiaryId || !form.bequestText.trim()) return [];
    return [
      {
        beneficiaryId: form.bequestBeneficiaryId,
        sharePercent: null,
        specificBequest: form.bequestText.trim(),
      },
    ];
  }
  return sharesToEntries(form.shares).map(e => ({ ...e, specificBequest: null }));
};

/** Why the form can't be saved yet, or null. An empty form is fine: it clears the allocation. */
export const allocationFormProblem = (form: AllocationForm): string | null => {
  if (form.mode === 'bequest') {
    const started = form.bequestBeneficiaryId !== null || form.bequestText.trim() !== '';
    if (started && (!form.bequestBeneficiaryId || !form.bequestText.trim())) {
      return 'Choose who gets it and describe the gift.';
    }
    return null;
  }
  if (hasInvalidText(form.shares)) return 'Use numbers like 50 or 33.33 (up to 2 decimals).';
  return allocationProblem(toAllocationEntries(form));
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
