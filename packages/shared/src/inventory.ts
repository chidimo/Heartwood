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

/** A calendar date as "YYYY-MM-DD", real, not in the future, and after 1900. */
const isoDate = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/, 'Use the format YYYY-MM-DD')
  .refine(value => {
    const [y, m, d] = value.split('-').map(Number);
    const date = new Date(Date.UTC(y, m - 1, d));
    const real =
      date.getUTCFullYear() === y && date.getUTCMonth() === m - 1 && date.getUTCDate() === d;
    return real && y >= 1900 && value <= new Date().toISOString().slice(0, 10);
  }, 'Enter a real date of birth that is not in the future');

/** Whole years between a "YYYY-MM-DD" birth date and a day. Birthdays count on the day itself. */
export const ageInYears = (dateOfBirth: string, on: Date = new Date()): number => {
  const [y, m, d] = dateOfBirth.split('-').map(Number);
  const years = on.getFullYear() - y;
  const hadBirthday = on.getMonth() + 1 > m || (on.getMonth() + 1 === m && on.getDate() >= d);
  return hadBirthday ? years : years - 1;
};

// Closed list, so a relationship can be relied on (and shown in the right words). Anything not on it
// is "other" with the testator's own words in relationshipOther. To add one: add it here, give it a
// label in apps/mobile (labels.ts), and widen beneficiary_relationship_check in the migration.
export const RELATIONSHIPS = [
  'wife',
  'husband',
  'son',
  'daughter',
  'stepchild',
  'father',
  'mother',
  'brother',
  'sister',
  'grandchild',
  'grandparent',
  'uncle',
  'aunt',
  'nephew',
  'niece',
  'cousin',
  'in_law',
  'friend',
  'other',
] as const;
export type Relationship = (typeof RELATIONSHIPS)[number];

export const BENEFICIARY_KINDS = ['person', 'institution'] as const;
export type BeneficiaryKind = (typeof BENEFICIARY_KINDS)[number];

// Closed list. To add a type: add it here, give it a label in apps/mobile (labels.ts), and write a
// migration that widens beneficiary_institution_type_check. "other" stays last.
export const INSTITUTION_TYPES = [
  'church',
  'mosque',
  'place_of_worship',
  'mission',
  'charity',
  'foundation',
  'orphanage',
  'school',
  'university',
  'hospital',
  'community',
  'association',
  'cooperative',
  'other',
] as const;
export type InstitutionType = (typeof INSTITUTION_TYPES)[number];

const plainOptionalText = (max: number) =>
  z
    .string()
    .trim()
    .max(max)
    .nullish()
    .transform(v => (v ? v : null));

const FALLBACK_MESSAGE = 'A fallback beneficiary goes with the "named beneficiary" plan only';
const NO_CHILDREN_MESSAGE = 'An organisation has no children to pass a gift to';

export const beneficiaryInputSchema = z
  .object({
    kind: z.enum(BENEFICIARY_KINDS).default('person'),
    name: plainText(200),
    relationship: z
      .enum(RELATIONSHIPS)
      .nullish()
      .transform(v => v ?? null),
    relationshipOther: plainOptionalText(100),
    institutionType: z
      .enum(INSTITUTION_TYPES)
      .nullish()
      .transform(v => v ?? null),
    contact: plainOptionalText(200),
    address: plainOptionalText(500),
    dateOfBirth: isoDate.nullish().transform(v => v ?? null),
    contingencyPlan: contingencyFields.contingencyPlan.default(null),
    contingencyBeneficiaryId: contingencyFields.contingencyBeneficiaryId.default(null),
  })
  .superRefine((v, ctx) => {
    const issue = (path: string, message: string) =>
      ctx.addIssue({ code: z.ZodIssueCode.custom, path: [path], message });
    if (!contingencyConsistent(v)) issue('contingencyBeneficiaryId', FALLBACK_MESSAGE);
    if (v.kind === 'person') {
      if (!v.relationship) issue('relationship', 'Say how this person is related to you');
      if (v.relationship === 'other' && !v.relationshipOther) {
        issue('relationshipOther', 'Say what the relationship is');
      }
      if (v.relationship !== 'other' && v.relationshipOther) {
        issue('relationshipOther', 'Only "other" needs the relationship in words');
      }
      if (v.institutionType) issue('institutionType', 'Only an organisation has a type');
      return;
    }
    if (!v.institutionType) issue('institutionType', 'Choose the kind of organisation');
    if (v.relationship || v.relationshipOther) {
      issue('relationship', 'An organisation has no relationship to you');
    }
    if (v.dateOfBirth) issue('dateOfBirth', 'An organisation has no date of birth');
    if (v.contingencyPlan === 'pass_to_descendants') issue('contingencyPlan', NO_CHILDREN_MESSAGE);
  });
export type BeneficiaryInput = z.infer<typeof beneficiaryInputSchema>;

// The kind of an existing beneficiary can't change; the server checks the rest against it.
export const beneficiaryUpdateSchema = z
  .object({
    name: plainText(200).optional(),
    relationship: z.enum(RELATIONSHIPS).nullable().optional(),
    relationshipOther: z.string().trim().min(1).max(100).nullable().optional(),
    institutionType: z.enum(INSTITUTION_TYPES).optional(),
    contact: z.string().trim().max(200).nullable().optional(),
    address: z.string().trim().max(500).nullable().optional(),
    dateOfBirth: isoDate.nullable().optional(),
    contingencyPlan: contingencyFields.contingencyPlan.optional(),
    contingencyBeneficiaryId: contingencyFields.contingencyBeneficiaryId.optional(),
  })
  .refine(
    v =>
      v.contingencyPlan === undefined && v.contingencyBeneficiaryId === undefined
        ? true
        : contingencyConsistent(v),
    { message: FALLBACK_MESSAGE, path: ['contingencyBeneficiaryId'] }
  );
export type BeneficiaryUpdate = z.infer<typeof beneficiaryUpdateSchema>;

export interface BeneficiaryDto {
  id: string;
  kind: BeneficiaryKind;
  name: string;
  /** How a person is related to the testator; null for an organisation. */
  relationship: Relationship | null;
  /** The relationship in the testator's words; only when relationship is "other". */
  relationshipOther: string | null;
  /** What kind of organisation; null for a person. */
  institutionType: InstitutionType | null;
  contact: string | null;
  /** Where to reach them: free text. */
  address: string | null;
  /** "YYYY-MM-DD"; people only, and only used to check age conditions. */
  dateOfBirth: string | null;
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

export const CONDITION_KINDS = ['min_age', 'other'] as const;
export const IF_UNMET_PLANS = ['redistribute', 'named_beneficiary', 'residuary'] as const;
export type IfUnmetPlan = (typeof IF_UNMET_PLANS)[number];

// What every condition needs besides its kind: what happens if it is never met, and who holds the
// asset until it is. A gift that waits on something with no holder and no fallback is the kind of
// dispute this app exists to prevent, so neither is optional.
const conditionCommon = {
  ifUnmet: z.enum(IF_UNMET_PLANS),
  fallbackBeneficiaryId: z
    .string()
    .uuid()
    .nullish()
    .transform(v => v ?? null),
  holderId: z.string().uuid(),
};

export const giftConditionSchema = z
  .discriminatedUnion('kind', [
    z.object({
      kind: z.literal('min_age'),
      minAge: z.number().int().min(1).max(100),
      ...conditionCommon,
    }),
    z.object({
      kind: z.literal('other'),
      text: z.string().trim().min(1).max(500),
      ...conditionCommon,
    }),
  ])
  .superRefine((c, ctx) => {
    if ((c.ifUnmet === 'named_beneficiary') !== Boolean(c.fallbackBeneficiaryId)) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['fallbackBeneficiaryId'],
        message: 'Name who receives it if the condition is not met, and only then',
      });
    }
  });
export type GiftCondition = z.infer<typeof giftConditionSchema>;

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
    condition: giftConditionSchema.nullish().transform(v => v ?? null),
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
  condition: GiftCondition | null;
}

export type IssueSeverity = 'error' | 'warning' | 'info';
export type IssueCode =
  | 'asset_uncovered'
  | 'asset_unallocated'
  | 'beneficiary_no_contingency'
  | 'beneficiary_unused'
  | 'gift_age_unverifiable'
  | 'gift_to_minor_unconditional'
  | 'no_beneficiaries';

export interface InventoryIssue {
  code: IssueCode;
  severity: IssueSeverity;
  entity: 'asset' | 'beneficiary' | 'inventory';
  id: string | null;
  /** What the issue is about, to show above the message: the asset's description or the person's name. */
  subject: string | null;
  message: string;
}

export interface InventoryReport {
  /** True when there are no errors (warnings and info don't block a draft will). */
  ok: boolean;
  issues: InventoryIssue[];
}
