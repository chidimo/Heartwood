import { z } from 'zod';
import { ASSET_TYPES } from './asset-types';

// Free text is the leak path for account numbers (docs/standards/security.md Rule 1): a Nigerian
// bank account (NUBAN) is 10 digits, so refuse any run of 10 or more digits in asset text.
const noAccountNumbers = (value: string) => !/\d{10,}/.test(value.replace(/[\s-]/g, ''));
const safeText = (max: number) =>
  z.string().trim().max(max).refine(noAccountNumbers, { message: "Don't include account numbers" });

const optionalText = (max: number) =>
  safeText(max)
    .nullish()
    .transform(v => (v ? v : null));

export const assetFields = {
  type: z.enum(ASSET_TYPES),
  description: safeText(500).pipe(z.string().min(1)),
  institution: optionalText(200),
  roughValue: z
    .number()
    .min(0)
    .max(1e15)
    .nullish()
    .transform(v => v ?? null),
  notes: optionalText(2000),
};
export const assetInputSchema = z.object(assetFields);
export type AssetInput = z.infer<typeof assetInputSchema>;
// Every field optional on update; an explicit null clears a nullable field.
export const assetUpdateSchema = z.object({
  type: assetFields.type.optional(),
  description: assetFields.description.optional(),
  institution: safeText(200).nullable().optional(),
  roughValue: z.number().min(0).max(1e15).nullable().optional(),
  notes: safeText(2000).nullable().optional(),
});
export type AssetUpdate = z.infer<typeof assetUpdateSchema>;

export interface AssetDto {
  id: string;
  type: (typeof ASSET_TYPES)[number];
  description: string;
  institution: string | null;
  roughValue: number | null;
  notes: string | null;
  createdAt: string;
  updatedAt: string;
}

export const CONTINGENCY_PLANS = [
  'redistribute',
  'pass_to_descendants',
  'named_beneficiary',
] as const;
export type ContingencyPlan = (typeof CONTINGENCY_PLANS)[number];

const plainText = (max: number) => z.string().trim().min(1).max(max);
const contingencyFields = {
  contingencyPlan: z.enum(CONTINGENCY_PLANS).nullable(),
  contingencyBeneficiaryId: z.string().uuid().nullable(),
};

const contingencyConsistent = (v: {
  contingencyPlan?: ContingencyPlan | null;
  contingencyBeneficiaryId?: string | null;
}) => (v.contingencyPlan === 'named_beneficiary') === Boolean(v.contingencyBeneficiaryId);

export const beneficiaryInputSchema = z
  .object({
    name: plainText(200),
    relationship: plainText(100),
    contact: z
      .string()
      .trim()
      .max(200)
      .nullish()
      .transform(v => (v ? v : null)),
    contingencyPlan: contingencyFields.contingencyPlan.default(null),
    contingencyBeneficiaryId: contingencyFields.contingencyBeneficiaryId.default(null),
  })
  .refine(contingencyConsistent, {
    message: 'A fallback beneficiary goes with the "named beneficiary" plan only',
    path: ['contingencyBeneficiaryId'],
  });
export type BeneficiaryInput = z.infer<typeof beneficiaryInputSchema>;

export const beneficiaryUpdateSchema = z
  .object({
    name: plainText(200).optional(),
    relationship: plainText(100).optional(),
    contact: z.string().trim().max(200).nullable().optional(),
    contingencyPlan: contingencyFields.contingencyPlan.optional(),
    contingencyBeneficiaryId: contingencyFields.contingencyBeneficiaryId.optional(),
  })
  .refine(
    v =>
      v.contingencyPlan === undefined && v.contingencyBeneficiaryId === undefined
        ? true
        : contingencyConsistent(v),
    {
      message: 'A fallback beneficiary goes with the "named beneficiary" plan only',
      path: ['contingencyBeneficiaryId'],
    }
  );
export type BeneficiaryUpdate = z.infer<typeof beneficiaryUpdateSchema>;

export interface BeneficiaryDto {
  id: string;
  name: string;
  relationship: string;
  contact: string | null;
  contingencyPlan: ContingencyPlan | null;
  contingencyBeneficiaryId: string | null;
  createdAt: string;
  updatedAt: string;
}

export const EXECUTOR_KINDS = ['executor', 'lawyer'] as const;
export const executorInputSchema = z.object({
  kind: z.enum(EXECUTOR_KINDS),
  name: plainText(200),
  contact: z
    .string()
    .trim()
    .max(200)
    .nullish()
    .transform(v => (v ? v : null)),
});
export type ExecutorInput = z.infer<typeof executorInputSchema>;
export const executorUpdateSchema = z.object({
  kind: z.enum(EXECUTOR_KINDS).optional(),
  name: plainText(200).optional(),
  contact: z.string().trim().max(200).nullable().optional(),
});
export type ExecutorUpdate = z.infer<typeof executorUpdateSchema>;
export interface ExecutorDto {
  id: string;
  kind: (typeof EXECUTOR_KINDS)[number];
  name: string;
  contact: string | null;
}

/** Two decimals, as stored (NUMERIC(5,2)). */
const percent = z
  .number()
  .gt(0)
  .max(100)
  .refine(n => Math.round(n * 100) / 100 === n, { message: 'Use at most 2 decimal places' });

export const allocationEntrySchema = z
  .object({
    beneficiaryId: z.string().uuid(),
    sharePercent: percent.nullish().transform(v => v ?? null),
    specificBequest: z
      .string()
      .trim()
      .min(1)
      .max(500)
      .nullish()
      .transform(v => v ?? null),
  })
  .refine(e => (e.sharePercent !== null) !== (e.specificBequest !== null), {
    message: 'Give either a share or a specific bequest',
    path: ['sharePercent'],
  });
export type AllocationEntry = z.infer<typeof allocationEntrySchema>;

export const replaceAllocationsSchema = z.object({
  entries: z.array(allocationEntrySchema).max(50),
});

export const residuaryEntrySchema = z.object({
  beneficiaryId: z.string().uuid(),
  sharePercent: percent,
});
export type ResiduaryEntry = z.infer<typeof residuaryEntrySchema>;
export const replaceResiduarySchema = z.object({ entries: z.array(residuaryEntrySchema).max(50) });

const hundredths = (n: number) => Math.round(n * 100);

/** Why an asset's allocation is invalid, or null if it is fine (an empty list is valid: no allocation). */
export const allocationProblem = (entries: AllocationEntry[]): string | null => {
  if (entries.length === 0) return null;
  if (new Set(entries.map(e => e.beneficiaryId)).size !== entries.length) {
    return 'Each beneficiary can appear once per asset';
  }
  const bequests = entries.filter(e => e.specificBequest !== null);
  if (bequests.length > 0) {
    return bequests.length === 1 && entries.length === 1
      ? null
      : 'A specific bequest must be the only entry for its asset';
  }
  const total = entries.reduce((sum, e) => sum + hundredths(e.sharePercent ?? 0), 0);
  return total === 10000 ? null : 'Shares must total exactly 100%';
};

/** Same rule for the residuary: shares total exactly 100%, or no entries. */
export const residuaryProblem = (entries: ResiduaryEntry[]): string | null => {
  if (entries.length === 0) return null;
  if (new Set(entries.map(e => e.beneficiaryId)).size !== entries.length) {
    return 'Each beneficiary can appear once';
  }
  const total = entries.reduce((sum, e) => sum + hundredths(e.sharePercent), 0);
  return total === 10000 ? null : 'Shares must total exactly 100%';
};

export interface AllocationDto {
  beneficiaryId: string;
  sharePercent: number | null;
  specificBequest: string | null;
}

export type IssueSeverity = 'error' | 'warning' | 'info';
export type IssueCode =
  | 'asset_uncovered'
  | 'asset_unallocated'
  | 'beneficiary_no_contingency'
  | 'beneficiary_unused'
  | 'no_beneficiaries';

export interface InventoryIssue {
  code: IssueCode;
  severity: IssueSeverity;
  entity: 'asset' | 'beneficiary' | 'inventory';
  id: string | null;
  message: string;
}

export interface InventoryReport {
  /** True when there are no errors (warnings and info don't block a draft will). */
  ok: boolean;
  issues: InventoryIssue[];
}
