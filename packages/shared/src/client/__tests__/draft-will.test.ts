import type {
  AllocationDto,
  AssetDto,
  BeneficiaryDto,
  ExecutorDto,
  InventoryIssue,
} from '../../inventory';
import { buildDraftWill, documentToText, draftFileName, type DraftInput } from '../draft-will';

const person = (id: string, name: string, over: Partial<BeneficiaryDto> = {}): BeneficiaryDto => ({
  id,
  kind: 'person',
  name,
  relationship: 'daughter',
  relationshipOther: null,
  institutionType: null,
  directoryId: null,
  contact: null,
  address: null,
  dateOfBirth: null,
  contingencyPlan: 'redistribute',
  contingencyBeneficiaryId: null,
  createdAt: '',
  updatedAt: '',
  ...over,
});

const asset = (id: string, description: string, over: Partial<AssetDto> = {}): AssetDto => ({
  id,
  type: 'property',
  description,
  institution: null,
  currency: 'NGN',
  roughValue: 45000000,
  notes: null,
  createdAt: '',
  updatedAt: '',
  ...over,
});

const ADA = person('ada', 'Ada Obi');
const CHIDI = person('chidi', 'Chidi Obi', { relationship: 'son' });
const CHURCH = person('church', 'Grace Chapel, Ikeja', {
  kind: 'institution',
  relationship: null,
  institutionType: 'church',
  address: 'Allen Avenue, Ikeja',
});

const EMEKA: ExecutorDto = { id: 'emeka', kind: 'executor', name: 'Uncle Emeka', contact: null };
const LAWYER: ExecutorDto = { id: 'law', kind: 'lawyer', name: 'Barr. Adeyemi', contact: null };

const FLAT = asset('flat', '3-bedroom flat, Surulere', {
  institution: 'Lagos State Land Registry',
});
const CAMRY = asset('camry', 'Toyota Camry 2014', { type: 'vehicle', roughValue: null });
const SHARES = asset('shares', 'Shares in the family business', { type: 'business_shares' });

const split = (entries: [string, number, AllocationDto['condition']?][]): AllocationDto[] =>
  entries.map(([beneficiaryId, sharePercent, condition]) => ({
    beneficiaryId,
    sharePercent,
    specificBequest: null,
    condition: condition ?? null,
  }));

const base = (over: Partial<DraftInput> = {}): DraftInput => ({
  testatorName: 'Ngozi Eze',
  testatorAddress: '12 Adeola Odeku Street, Victoria Island, Lagos',
  preparedAt: 'Wednesday, 11 November 2026 at 2:32:09 pm',
  assets: [FLAT, CAMRY, SHARES],
  beneficiaries: [ADA, CHIDI, CHURCH],
  executors: [EMEKA, LAWYER],
  allocations: {
    flat: split([
      [
        'ada',
        50,
        {
          kind: 'min_age',
          minAge: 25,
          text: null,
          ifUnmet: 'named_beneficiary',
          fallbackBeneficiaryId: 'chidi',
          holderId: 'law',
        },
      ],
      ['chidi', 50],
    ]),
    camry: [
      {
        beneficiaryId: 'chidi',
        sharePercent: null,
        specificBequest: 'The Camry, with its documents',
        condition: null,
      },
    ],
  },
  residuary: [
    { beneficiaryId: 'ada', sharePercent: 40 },
    { beneficiaryId: 'church', sharePercent: 60 },
  ],
  issues: [],
  ...over,
});

type Draft = ReturnType<typeof buildDraftWill>;

const clause = (draft: Draft, heading: string) =>
  draft.will.sections.find(s => s.heading === heading)?.paragraphs ?? [];

/** The gifts, flattened: every asset's paragraphs in order. */
const gifts = (draft: Draft) =>
  (
    draft.will.sections.find(s => s.heading === 'Gifts of particular assets')?.subsections ?? []
  ).flatMap(sub => sub.paragraphs);

describe('buildDraftWill', () => {
  it('opens with the testator, revokes earlier wills and names the executor (not the lawyer)', () => {
    const draft = buildDraftWill(base());
    expect(draft.will.title).toBe('DRAFT LAST WILL AND TESTAMENT OF NGOZI EZE');
    expect(draft.will.banner).toContain('This is not a valid will');
    expect(clause(draft, 'Opening')[0]).toContain('Ngozi Eze of 12 Adeola Odeku Street');
    expect(clause(draft, 'Revocation')[0]).toContain('revoke all earlier wills');
    expect(clause(draft, 'Executors')).toEqual([
      'I appoint Uncle Emeka to be the executor of this will.',
    ]);
  });

  it('opens with the address from the profile, or a gap when there is none', () => {
    expect(clause(buildDraftWill(base()), 'Opening')[0]).toContain(
      'Ngozi Eze of 12 Adeola Odeku Street, Victoria Island, Lagos.'
    );
    expect(clause(buildDraftWill(base({ testatorAddress: null })), 'Opening')[0]).toContain(
      'of [ADDRESS].'
    );
    expect(clause(buildDraftWill(base({ testatorAddress: '   ' })), 'Opening')[0]).toContain(
      '[ADDRESS]'
    );
  });

  it('gives each asset a heading of its own, with its distribution beneath', () => {
    const section = buildDraftWill(base()).will.sections.find(
      s => s.heading === 'Gifts of particular assets'
    );
    expect(section?.subsections?.map(sub => sub.heading)).toEqual([
      '3-bedroom flat, Surulere',
      'Toyota Camry 2014',
    ]);
    expect(section?.subsections?.[0]?.paragraphs[0]).toContain('I give 3-bedroom flat, Surulere');
    expect(section?.paragraphs).toEqual([]);
  });

  it('leaves a gap when no executor is named', () => {
    const draft = buildDraftWill(base({ executors: [LAWYER] }));
    expect(clause(draft, 'Executors')[0]).toContain('[EXECUTOR TO BE CHOSEN]');
  });

  it('writes a split with shares, a bequest in words, and the condition on a gift', () => {
    const written = gifts(buildDraftWill(base()));
    expect(written[0]).toContain(
      'I give 3-bedroom flat, Surulere (held at Lagos State Land Registry)'
    );
    expect(written[0]).toContain('Ada Obi (my daughter) as to 50%');
    expect(written[0]).toContain('Chidi Obi (my son) as to 50%');
    expect(written[1]).toContain('made on condition of Ada Obi reaching the age of 25 years');
    expect(written[1]).toContain('Barr. Adeyemi shall hold Ada Obi');
    expect(written[1]).toContain('it shall go to Chidi Obi (my son)');
    expect(written[2]).toBe(
      'I give Toyota Camry 2014 to Chidi Obi (my son), namely: The Camry, with its documents.'
    );
  });

  it('words a free-text condition as a condition, not as a sentence fragment', () => {
    const other = {
      kind: 'other' as const,
      text: 'Held until he is 21',
      ifUnmet: 'residuary' as const,
      fallbackBeneficiaryId: null,
      holderId: 'law',
    };
    const written = gifts(
      buildDraftWill(base({ allocations: { flat: split([['ada', 100, other]]) } }))
    );
    expect(written[1]).toContain('is made on the following condition: Held until he is 21.');
    expect(written[1]).toContain('it shall fall into the residue of my estate');
  });

  it('sends unallocated assets to the residue and lists them there', () => {
    const [residue] = clause(buildDraftWill(base()), 'Residue');
    expect(residue).toContain('including Shares in the family business,');
    expect(residue).toContain('Ada Obi (my daughter) as to 40%');
    expect(residue).toContain('Grace Chapel, Ikeja (church), of Allen Avenue, Ikeja as to 60%');
  });

  it('leaves a gap for the residue when none is chosen', () => {
    const [residue] = clause(buildDraftWill(base({ residuary: [] })), 'Residue');
    expect(residue).toContain('[RESIDUARY BENEFICIARIES TO BE CHOSEN]');
  });

  it('covers a beneficiary who cannot take, by their own plan, and flags a missing plan', () => {
    const draft = buildDraftWill(
      base({
        beneficiaries: [
          ADA,
          person('chidi', 'Chidi Obi', {
            relationship: 'son',
            contingencyPlan: 'named_beneficiary',
            contingencyBeneficiaryId: 'ada',
          }),
          { ...CHURCH, contingencyPlan: null },
        ],
      })
    );
    const lines = clause(draft, 'If a beneficiary cannot take');
    expect(lines.find(l => l.startsWith('If Ada Obi'))).toContain(
      'shared among my other beneficiaries'
    );
    expect(lines.find(l => l.startsWith('If Chidi Obi'))).toContain('go to Ada Obi (my daughter)');
    expect(lines.find(l => l.startsWith('If Grace Chapel'))).toContain(
      'no longer exists at my death'
    );
    expect(lines.find(l => l.startsWith('If Grace Chapel'))).toContain('[NO PLAN CHOSEN');
  });

  it('ends with a signing block with two witnesses', () => {
    const signing = clause(buildDraftWill(base()), 'Signing');
    expect(signing).toContain('Witness 1');
    expect(signing).toContain('Witness 2');
    expect(signing.filter(l => l.startsWith('Signature:'))).toHaveLength(2);
    expect(signing[0]).toContain('[DATE]');
  });

  it('gives the lawyer the assumptions, the review issues, the schedule and the people', () => {
    const issue: InventoryIssue = {
      code: 'beneficiary_no_contingency',
      severity: 'warning',
      entity: 'beneficiary',
      id: 'chidi',
      subject: 'Chidi Obi',
      message: 'No plan for if this beneficiary dies before you.',
    };
    const notes = buildDraftWill(
      base({
        issues: [issue],
        assets: [asset('flat', 'Flat', { notes: 'Deed with the family lawyer' })],
      })
    ).notes;
    const text = (heading: string) =>
      notes.sections.find(s => s.heading.startsWith(heading))?.paragraphs.join('\n') ?? '';
    expect(text('How this draft was made')).toContain('Q18');
    expect(text('Points to check')).toContain(
      'Chidi Obi: No plan for if this beneficiary dies before you.'
    );
    expect(text('Points to check')).toContain('1 gift carries a condition');
    expect(text('Schedule of assets')).toContain('notes: Deed with the family lawyer');
    expect(text('People named')).toContain('Executor, lawyer or priest: Barr. Adeyemi; lawyer');
  });

  it('says when the copy was made, as a full timestamp, on both documents', () => {
    const draft = buildDraftWill(base());
    expect(draft.preparedAt).toBe('Wednesday, 11 November 2026 at 2:32:09 pm');
    expect(draft.will.banner).toContain('Wednesday, 11 November 2026 at 2:32:09 pm');
    expect(draft.notes.banner).toContain('Wednesday, 11 November 2026 at 2:32:09 pm');
  });

  it('keeps the will and the lawyer notes as two separate documents', () => {
    const draft = buildDraftWill(base());
    expect(draft.will.title).toContain('LAST WILL AND TESTAMENT');
    expect(draft.notes.title).toContain('NOTES FOR THE REVIEWING LAWYER');
    expect(draft.notes.banner).toContain('NOT PART OF THE WILL');
    expect(JSON.stringify(draft.will)).not.toContain('Schedule of assets');
    expect(JSON.stringify(draft.notes)).not.toContain('Witness 1');
  });

  it('gives the schedule amounts with the currency code, so any PDF font can print them', () => {
    const notes = buildDraftWill(base()).notes;
    const schedule = notes.sections
      .find(s => s.heading.startsWith('Schedule'))
      ?.paragraphs.join('\n');
    expect(schedule).toContain('rough value NGN 45,000,000');
    expect(schedule).not.toContain('₦');
    expect(schedule).not.toContain('rough value Value not set');
  });

  it('renders each document as plain text, with the reference when there is one', () => {
    const draft = { ...buildDraftWill(base()), reference: 'ABC123DEF456' };
    const will = documentToText(draft, 'will');
    expect(will).toContain('DRAFT LAST WILL AND TESTAMENT OF NGOZI EZE');
    expect(will).toContain('2. REVOCATION');
    expect(will).toContain('4.1 3-bedroom flat, Surulere');
    expect(will).toContain('4.2 Toyota Camry 2014');
    expect(will).toContain('Reference: ABC123DEF456');
    const notes = documentToText(draft, 'notes');
    expect(notes).toContain('NOTES FOR THE REVIEWING LAWYER');
    expect(notes).not.toContain('REVOCATION');
  });
});

describe('draftFileName', () => {
  it('says what the file is, then whose it is', () => {
    expect(draftFileName('will', 'Ngozi Eze', 'pdf')).toBe('draft-will-ngozi-eze.pdf');
    expect(draftFileName('notes', 'Ngozi Eze', 'docx')).toBe('notes-for-lawyer-ngozi-eze.docx');
  });

  it('folds accents and drops anything a file name should not hold', () => {
    expect(draftFileName('will', 'Ọlá Ẹniọla Ṣobọ', 'pdf')).toBe('draft-will-ola-eniola-sobo.pdf');
    expect(draftFileName('will', "  Chidi  O'Brien-Eze / Jr. ", 'pdf')).toBe(
      'draft-will-chidi-o-brien-eze-jr.pdf'
    );
  });

  it('falls back to the plain name when the person has none to use', () => {
    expect(draftFileName('will', '', 'pdf')).toBe('draft-will.pdf');
    expect(draftFileName('notes', '???', 'docx')).toBe('notes-for-lawyer.docx');
  });

  it('carries the name on the draft itself', () => {
    expect(buildDraftWill(base()).testatorName).toBe('Ngozi Eze');
  });
});
