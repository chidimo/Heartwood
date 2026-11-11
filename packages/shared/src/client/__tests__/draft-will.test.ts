import type {
  AllocationDto,
  AssetDto,
  BeneficiaryDto,
  ExecutorDto,
  InventoryIssue,
} from '../../inventory';
import { buildDraftWill, draftToText, type DraftInput } from '../draft-will';

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
  preparedOn: '2026-11-11',
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

const clause = (draft: ReturnType<typeof buildDraftWill>, heading: string) =>
  draft.will.find(s => s.heading === heading)?.paragraphs ?? [];

describe('buildDraftWill', () => {
  it('opens with the testator, revokes earlier wills and names the executor (not the lawyer)', () => {
    const draft = buildDraftWill(base());
    expect(draft.title).toBe('DRAFT LAST WILL AND TESTAMENT OF NGOZI EZE');
    expect(draft.banner).toContain('This is not a valid will');
    expect(clause(draft, 'Opening')[0]).toContain('Ngozi Eze of [ADDRESS]');
    expect(clause(draft, 'Revocation')[0]).toContain('revoke all earlier wills');
    expect(clause(draft, 'Executors')).toEqual([
      'I appoint Uncle Emeka to be the executor of this will.',
    ]);
  });

  it('leaves a gap when no executor is named', () => {
    const draft = buildDraftWill(base({ executors: [LAWYER] }));
    expect(clause(draft, 'Executors')[0]).toContain('[EXECUTOR TO BE CHOSEN]');
  });

  it('writes a split with shares, a bequest in words, and the condition on a gift', () => {
    const gifts = clause(buildDraftWill(base()), 'Gifts of particular assets');
    expect(gifts[0]).toContain(
      'I give 3-bedroom flat, Surulere (held at Lagos State Land Registry)'
    );
    expect(gifts[0]).toContain('Ada Obi (my daughter) as to 50%');
    expect(gifts[0]).toContain('Chidi Obi (my son) as to 50%');
    expect(gifts[1]).toContain('made on condition of Ada Obi reaching the age of 25 years');
    expect(gifts[1]).toContain('Barr. Adeyemi shall hold Ada Obi');
    expect(gifts[1]).toContain('it shall go to Chidi Obi (my son)');
    expect(gifts[2]).toBe(
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
    const gifts = clause(
      buildDraftWill(base({ allocations: { flat: split([['ada', 100, other]]) } })),
      'Gifts of particular assets'
    );
    expect(gifts[1]).toContain('is made on the following condition: Held until he is 21.');
    expect(gifts[1]).toContain('it shall fall into the residue of my estate');
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
    expect(signing.some(l => l.startsWith('Witness 1.'))).toBe(true);
    expect(signing.some(l => l.startsWith('Witness 2.'))).toBe(true);
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
      notes.find(s => s.heading.startsWith(heading))?.paragraphs.join('\n') ?? '';
    expect(text('How this draft was made')).toContain('Q18');
    expect(text('Points to check')).toContain(
      'Chidi Obi: No plan for if this beneficiary dies before you.'
    );
    expect(text('Points to check')).toContain('1 gift carries a condition');
    expect(text('Schedule of assets')).toContain('notes: Deed with the family lawyer');
    expect(text('People named')).toContain('Executor, lawyer or priest: Barr. Adeyemi; lawyer');
  });

  it('renders the whole draft as plain text', () => {
    const text = draftToText(buildDraftWill(base()));
    expect(text).toContain('DRAFT LAST WILL AND TESTAMENT OF NGOZI EZE');
    expect(text).toContain('2. REVOCATION');
    expect(text).toContain('NOTES FOR THE REVIEWING LAWYER (NOT PART OF THE WILL)');
  });
});
