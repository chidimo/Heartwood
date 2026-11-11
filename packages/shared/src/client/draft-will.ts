import type {
  AllocationDto,
  AssetDto,
  BeneficiaryDto,
  ExecutorDto,
  GiftCondition,
  InventoryIssue,
  ResiduaryEntry,
} from '../inventory';
import { ASSET_TYPE_LABELS, formatValue } from './asset-labels';
import { INSTITUTION_TYPE_LABELS, relationshipLabel } from './labels';

// A draft will built from what the person entered, for a lawyer to correct. It states what they asked for
// and leaves bracketed gaps for what only a lawyer can settle. It is not legal advice and not a valid will.

export interface DraftSection {
  heading: string;
  paragraphs: string[];
}

export interface DraftWill {
  title: string;
  /** The warning shown above everything: this is not yet a will. */
  banner: string;
  /** The will itself, clause by clause. */
  will: DraftSection[];
  /** Notes for the reviewing lawyer: not part of the will. */
  notes: DraftSection[];
}

export interface DraftInput {
  testatorName: string;
  /** "YYYY-MM-DD", shown in the banner. */
  preparedOn: string;
  assets: AssetDto[];
  beneficiaries: BeneficiaryDto[];
  executors: ExecutorDto[];
  /** asset id -> its allocation (absent or empty = the asset falls to the residuary). */
  allocations: Record<string, AllocationDto[]>;
  residuary: ResiduaryEntry[];
  /** Every issue the review found, not one page of them. */
  issues: InventoryIssue[];
}

const BLANK = '____________________';
const ADDRESS_GAP = '[ADDRESS]';
const DATE_GAP = '[DATE]';

const percentText = (value: number): string => `${Number(value.toFixed(2))}%`;

const joinNames = (names: string[]): string => {
  if (names.length <= 1) return names.join('');
  return `${names.slice(0, -1).join(', ')} and ${names[names.length - 1]}`;
};

/** "Ada Obi (my daughter)" or "Grace Chapel, Ikeja (church), of Allen Avenue". */
const describe = (b: BeneficiaryDto): string => {
  if (b.kind === 'person') {
    const relation = relationshipLabel(b).toLowerCase();
    return relation ? `${b.name} (my ${relation})` : b.name;
  }
  const type = b.institutionType
    ? INSTITUTION_TYPE_LABELS[b.institutionType].toLowerCase()
    : 'organisation';
  const place = b.address ? `, of ${b.address}` : '';
  return `${b.name} (${type})${place}`;
};

const assetRef = (a: AssetDto): string =>
  a.institution ? `${a.description} (held at ${a.institution})` : a.description;

/** The condition as a clause: "on condition of Ada reaching the age of 25 years". */
const conditionPhrase = (c: GiftCondition, who: string): string => {
  if (c.kind === 'other') return `on the following condition: ${c.text}`;
  const note = c.text ? ` (${c.text})` : '';
  if (c.kind === 'min_age')
    return `on condition of ${who} reaching the age of ${c.minAge} years${note}`;
  if (c.kind === 'marriage') return `on condition of ${who} marrying${note}`;
  if (c.kind === 'education') return `on condition of ${who} completing their education${note}`;
  if (c.kind === 'nysc') {
    return `on condition of ${who} completing the National Youth Service Corps (NYSC)${note}`;
  }
  const days = `${c.days} ${c.days === 1 ? 'day' : 'days'}`;
  return `on condition of ${who} surviving me by ${days}${note}`;
};

const sharesText = (
  entries: { beneficiaryId: string; sharePercent: number | null }[],
  people: Map<string, BeneficiaryDto>
): string =>
  entries
    .map(e => {
      const person = people.get(e.beneficiaryId);
      return `${person ? describe(person) : '[UNKNOWN BENEFICIARY]'} as to ${percentText(e.sharePercent ?? 0)}`;
    })
    .join('; ');

/** What happens to a condition's gift if it is never met, in the testator's own choice of words. */
const unmetText = (c: GiftCondition, people: Map<string, BeneficiaryDto>): string => {
  if (c.ifUnmet === 'named_beneficiary') {
    const fallback = people.get(c.fallbackBeneficiaryId ?? '');
    return `it shall go to ${fallback ? describe(fallback) : '[PERSON TO BE NAMED]'}`;
  }
  if (c.ifUnmet === 'residuary') return 'it shall fall into the residue of my estate';
  return 'it shall be shared among my other beneficiaries';
};

const giftClause = (
  asset: AssetDto,
  entries: AllocationDto[],
  people: Map<string, BeneficiaryDto>,
  executors: Map<string, ExecutorDto>
): string[] => {
  const ref = assetRef(asset);
  const first = entries[0];
  const paragraphs: string[] = [];
  if (first?.specificBequest) {
    const person = people.get(first.beneficiaryId);
    const who = person ? describe(person) : '[UNKNOWN BENEFICIARY]';
    paragraphs.push(`I give ${ref} to ${who}, namely: ${first.specificBequest}.`);
  } else {
    paragraphs.push(
      `I give ${ref} to the following, in the shares stated: ${sharesText(entries, people)}.`
    );
  }
  for (const entry of entries) {
    const c = entry.condition;
    if (!c) continue;
    const person = people.get(entry.beneficiaryId);
    const name = person?.name ?? '[UNKNOWN BENEFICIARY]';
    const holder = executors.get(c.holderId)?.name ?? '[HOLDER TO BE NAMED]';
    paragraphs.push(
      `The gift of ${ref} to ${name} is made ${conditionPhrase(c, name)}. Until that condition is met, ${holder} shall hold ${name}'s share. If the condition is not met, ${unmetText(c, people)}.`
    );
  }
  return paragraphs;
};

const contingencyClause = (
  recipients: BeneficiaryDto[],
  people: Map<string, BeneficiaryDto>
): string[] =>
  recipients.map(b => {
    const gone = b.kind === 'person' ? 'does not survive me' : 'no longer exists at my death';
    if (b.contingencyPlan === 'redistribute') {
      return `If ${b.name} ${gone}, what was given to them shall be shared among my other beneficiaries.`;
    }
    if (b.contingencyPlan === 'pass_to_descendants') {
      return `If ${b.name} ${gone}, what was given to them shall pass to their children living at my death, in equal shares. [LAWYER TO SPECIFY HOW AND WHEN]`;
    }
    if (b.contingencyPlan === 'named_beneficiary') {
      const fallback = people.get(b.contingencyBeneficiaryId ?? '');
      return `If ${b.name} ${gone}, what was given to them shall go to ${fallback ? describe(fallback) : '[PERSON TO BE NAMED]'}.`;
    }
    return `If ${b.name} ${gone}: [NO PLAN CHOSEN. LAWYER TO ADVISE]`;
  });

const executorsClause = (executors: ExecutorDto[]): string[] => {
  const named = executors.filter(x => x.kind === 'executor').map(x => x.name);
  if (named.length === 0)
    return ['I appoint [EXECUTOR TO BE CHOSEN] to be the executor of this will.'];
  const noun = named.length === 1 ? 'the executor' : 'the executors';
  return [`I appoint ${joinNames(named)} to be ${noun} of this will.`];
};

const willSections = (input: DraftInput, people: Map<string, BeneficiaryDto>): DraftSection[] => {
  const executors = new Map(input.executors.map(x => [x.id, x]));
  const sections: DraftSection[] = [
    {
      heading: 'Opening',
      paragraphs: [`THIS IS THE LAST WILL of me, ${input.testatorName} of ${ADDRESS_GAP}.`],
    },
    { heading: 'Revocation', paragraphs: ['I revoke all earlier wills and codicils made by me.'] },
    { heading: 'Executors', paragraphs: executorsClause(input.executors) },
  ];

  const allocated = input.assets.filter(a => (input.allocations[a.id] ?? []).length > 0);
  if (allocated.length > 0) {
    sections.push({
      heading: 'Gifts of particular assets',
      paragraphs: allocated.flatMap(a =>
        giftClause(a, input.allocations[a.id] ?? [], people, executors)
      ),
    });
  }

  const receivingIds = new Set([
    ...Object.values(input.allocations).flatMap(list => list.map(e => e.beneficiaryId)),
    ...input.residuary.map(r => r.beneficiaryId),
  ]);
  const receiving = input.beneficiaries.filter(b => receivingIds.has(b.id));
  if (receiving.length > 0) {
    sections.push({
      heading: 'If a beneficiary cannot take',
      paragraphs: contingencyClause(receiving, people),
    });
  }

  const left = input.assets.filter(a => (input.allocations[a.id] ?? []).length === 0);
  const leftText = left.length > 0 ? `, including ${joinNames(left.map(assetRef))},` : '';
  const residueText =
    input.residuary.length > 0
      ? `I give all the rest of my estate${leftText} to the following, in the shares stated: ${sharesText(input.residuary, people)}.`
      : `I give all the rest of my estate${leftText} to [RESIDUARY BENEFICIARIES TO BE CHOSEN].`;
  sections.push({ heading: 'Residue', paragraphs: [residueText] });

  sections.push({
    heading: 'Signing',
    paragraphs: [
      `IN WITNESS of which I have signed this will on ${DATE_GAP}.`,
      `SIGNED by the testator, ${input.testatorName}, in the presence of both of us, present at the same time, who have signed as witnesses in the testator's presence:`,
      `Testator: ${BLANK}`,
      `Witness 1. Name: ${BLANK}  Address: ${BLANK}  Occupation: ${BLANK}  Signature: ${BLANK}`,
      `Witness 2. Name: ${BLANK}  Address: ${BLANK}  Occupation: ${BLANK}  Signature: ${BLANK}`,
    ],
  });
  return sections;
};

const ASSUMPTIONS = [
  'State: drafted as if for Lagos only (open question Q1). Other states may differ.',
  'Signing: written for signing and witnessing on paper. Digital signing is not assumed (Q2). The execution formalities above must be confirmed.',
  'Conditions on gifts: age, marriage, education, NYSC, survival and free-text conditions are written as the person asked. Which of them are enforceable is open (Q18), and marriage and conduct conditions are the likeliest to fail.',
  'Gifts to organisations: names are as the person entered them or chose them from a shared list. Neither has been checked against CAC registration (Q17).',
  'Customary and Islamic law: no limits on who may receive what have been applied or checked (Q5).',
  'Standard clauses (revocation, appointment of executors, holding of conditional gifts, failure of gifts) are plain placeholders for the lawyer to replace with proper wording.',
];

const issueLine = (issue: InventoryIssue): string =>
  issue.subject ? `${issue.subject}: ${issue.message}` : issue.message;

const noteSections = (input: DraftInput): DraftSection[] => {
  const conditional = Object.values(input.allocations).flatMap(list =>
    list.filter(e => e.condition !== null)
  ).length;
  const sections: DraftSection[] = [
    { heading: 'How this draft was made', paragraphs: ASSUMPTIONS },
  ];

  const checks = input.issues.map(issueLine);
  if (conditional > 0) {
    checks.unshift(
      `${conditional} ${conditional === 1 ? 'gift carries' : 'gifts carry'} a condition. Check each for enforceability and for who should hold the asset.`
    );
  }
  sections.push({
    heading: 'Points to check',
    paragraphs: checks.length > 0 ? checks : ['The review found nothing to flag.'],
  });

  sections.push({
    heading: 'Schedule of assets (for information, not part of the will)',
    paragraphs:
      input.assets.length > 0
        ? input.assets.map(a => {
            const parts = [
              ASSET_TYPE_LABELS[a.type],
              a.description,
              a.institution ? `held at ${a.institution}` : null,
              `rough value ${formatValue(a.roughValue, a.currency)}`,
              a.notes ? `notes: ${a.notes}` : null,
            ];
            return parts.filter(Boolean).join('; ');
          })
        : ['No assets have been listed.'],
  });

  const people = input.beneficiaries.map(b => {
    const parts = [describe(b), b.contact, b.dateOfBirth ? `born ${b.dateOfBirth}` : null];
    return parts.filter(Boolean).join('; ');
  });
  const named = input.executors.map(x => [x.name, x.kind, x.contact].filter(Boolean).join('; '));
  sections.push({
    heading: 'People named',
    paragraphs: [
      ...(people.length > 0 ? people : ['No beneficiaries have been listed.']),
      ...named.map(line => `Executor, lawyer or priest: ${line}`),
    ],
  });
  return sections;
};

export const buildDraftWill = (input: DraftInput): DraftWill => {
  const people = new Map(input.beneficiaries.map(b => [b.id, b]));
  return {
    title: `DRAFT LAST WILL AND TESTAMENT OF ${input.testatorName.toUpperCase()}`,
    banner: `DRAFT FOR LAWYER REVIEW. Prepared with Heartwood on ${input.preparedOn} from the person's own instructions. This is not a valid will. It becomes one only after a lawyer has reviewed and corrected it and it has been signed and witnessed as the law requires.`,
    will: willSections(input, people),
    notes: noteSections(input),
  };
};

/** The whole draft as plain text, for sharing from a phone or pasting into an email. */
export const draftToText = (draft: DraftWill): string => {
  const block = (s: DraftSection, index?: number) => {
    const heading = index === undefined ? s.heading : `${index + 1}. ${s.heading}`;
    return [heading.toUpperCase(), ...s.paragraphs].join('\n\n');
  };
  return [
    draft.title,
    draft.banner,
    ...draft.will.map(block),
    'NOTES FOR THE REVIEWING LAWYER (NOT PART OF THE WILL)',
    ...draft.notes.map(s => block(s)),
  ].join('\n\n');
};
