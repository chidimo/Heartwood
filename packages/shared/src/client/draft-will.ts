import type {
  AllocationDto,
  AssetDto,
  BeneficiaryDto,
  ExecutorDto,
  GiftCondition,
  InventoryIssue,
  ResiduaryEntry,
} from '../inventory';
import { ASSET_TYPE_LABELS } from './asset-labels';
import { formatLongDate } from './dates';
import { INSTITUTION_TYPE_LABELS, relationshipLabel } from './labels';

// A draft will built from what the person entered, for a lawyer to correct. It states what they asked for
// and leaves bracketed gaps for what only a lawyer can settle. It is not legal advice and not a valid will.

export interface DraftSection {
  heading: string;
  paragraphs: string[];
  /** Smaller parts under this heading: one per asset in the gifts. */
  subsections?: DraftSection[];
}

/** One document of the draft: the will itself, or the lawyer's notes. */
export interface DraftDocument {
  title: string;
  /** The warning shown above it. */
  banner: string;
  sections: DraftSection[];
}

export type DraftDocumentKey = 'will' | 'notes';

/** Two separate documents: the will, and notes for the lawyer who reviews it. */
export interface DraftWill {
  /** Whose draft it is, as they gave their name. */
  testatorName: string;
  /** When this copy was made, in words: "Wednesday, 11 November 2026 at 2:32:09 pm". */
  preparedAt: string;
  /** A short code from the exact words of both documents, so a copy can be checked against the app's own. Set by the server. */
  reference: string | null;
  will: DraftDocument;
  notes: DraftDocument;
}

export interface DraftInput {
  testatorName: string;
  /** Where the testator lives, or null when not given (the draft then leaves a gap). */
  testatorAddress: string | null;
  /** When this copy is made, already in words: "Wednesday, 11 November 2026 at 2:32:09 pm". */
  preparedAt: string;
  assets: AssetDto[];
  beneficiaries: BeneficiaryDto[];
  executors: ExecutorDto[];
  /** asset id -> its allocation (absent or empty = the asset falls to the residuary). */
  allocations: Record<string, AllocationDto[]>;
  residuary: ResiduaryEntry[];
  /** Every issue the review found, not one page of them. */
  issues: InventoryIssue[];
}

/** "NGN 45,000,000": the currency as its code, since a PDF font may not have the naira sign. */
const plainAmount = (value: number, currency: string): string => {
  const digits = new Intl.NumberFormat('en-NG', {
    minimumFractionDigits: Number.isInteger(value) ? 0 : 2,
    maximumFractionDigits: 2,
  }).format(value);
  return `${currency} ${digits}`;
};

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
      paragraphs: [
        `THIS IS THE LAST WILL of me, ${input.testatorName} of ${input.testatorAddress?.trim() || ADDRESS_GAP}.`,
      ],
    },
    { heading: 'Revocation', paragraphs: ['I revoke all earlier wills and codicils made by me.'] },
    { heading: 'Executors', paragraphs: executorsClause(input.executors) },
  ];

  const allocated = input.assets.filter(a => (input.allocations[a.id] ?? []).length > 0);
  if (allocated.length > 0) {
    sections.push({
      heading: 'Gifts of particular assets',
      paragraphs: [],
      // Each asset is named in a heading of its own, with its distribution beneath.
      subsections: allocated.map(a => ({
        heading: a.description,
        paragraphs: giftClause(a, input.allocations[a.id] ?? [], people, executors),
      })),
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
      `Signature of the testator: ${BLANK}`,
      ...[1, 2].flatMap(n => [
        `Witness ${n}`,
        `Name: ${BLANK}`,
        `Address: ${BLANK}`,
        `Occupation: ${BLANK}`,
        `Signature: ${BLANK}`,
      ]),
    ],
  });
  return sections;
};

const ASSUMPTIONS = [
  'State: drafted as if for Lagos only (open question Q1). Other states may differ.',
  'Signing: written for signing and witnessing on paper. Digital signing is not assumed (Q2). The execution formalities in the signing clause of the will must be confirmed.',
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
              a.roughValue === null ? null : `rough value ${plainAmount(a.roughValue, a.currency)}`,
              a.notes ? `notes: ${a.notes}` : null,
            ];
            return parts.filter(Boolean).join('; ');
          })
        : ['No assets have been listed.'],
  });

  const people = input.beneficiaries.map(b => {
    const parts = [
      describe(b),
      b.contact,
      b.dateOfBirth ? `born ${formatLongDate(b.dateOfBirth)}` : null,
    ];
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
  const name = input.testatorName.toUpperCase();
  return {
    testatorName: input.testatorName,
    preparedAt: input.preparedAt,
    reference: null,
    will: {
      title: `DRAFT LAST WILL AND TESTAMENT OF ${name}`,
      banner: `DRAFT FOR LAWYER REVIEW. Prepared with Heartwood on ${input.preparedAt} from the person's own instructions. This is not a valid will. It becomes one only after a lawyer has reviewed and corrected it and it has been signed and witnessed as the law requires.`,
      sections: willSections(input, people),
    },
    notes: {
      title: `NOTES FOR THE REVIEWING LAWYER: DRAFT WILL OF ${name}`,
      banner: `NOT PART OF THE WILL. Prepared with Heartwood on ${input.preparedAt} to help the lawyer who reviews the draft will. It is a summary of what the person entered, not legal advice, and it binds no one.`,
      sections: noteSections(input),
    },
  };
};

/** One section as text: its heading, its paragraphs, then each smaller part numbered under it (4.1, 4.2). */
const sectionText = (section: DraftSection, number?: string): string => {
  const title = number ? `${number}. ${section.heading}` : section.heading;
  const parts = (section.subsections ?? []).map((sub, i) =>
    [`${number ?? ''}${number ? '.' : ''}${i + 1} ${sub.heading}`, ...sub.paragraphs].join('\n\n')
  );
  return [title.toUpperCase(), ...section.paragraphs, ...parts].join('\n\n');
};

/** One document as plain text, for sharing from a phone or pasting into an email. */
export const documentToText = (draft: DraftWill, key: DraftDocumentKey): string => {
  const doc = draft[key];
  const numbered = key === 'will';
  return [
    doc.title,
    doc.banner,
    draft.reference ? `Reference: ${draft.reference}` : null,
    ...doc.sections.map((section, index) =>
      sectionText(section, numbered ? String(index + 1) : undefined)
    ),
  ]
    .filter((part): part is string => part !== null)
    .join('\n\n');
};

/**
 * The name of a downloaded file: what it is, then whose it is, in plain letters and hyphens, such as
 * "draft-will-ngozi-eze.pdf". Accents are folded (Ọlá becomes ola) so the name is safe in any header.
 */
export const draftFileName = (
  document: DraftDocumentKey,
  personName: string,
  format: 'pdf' | 'docx'
): string => {
  const what = document === 'will' ? 'draft-will' : 'notes-for-lawyer';
  const who = personName
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
  return `${[what, who].filter(Boolean).join('-')}.${format}`;
};
