import { CONDITION_KINDS, INSTITUTION_TYPES, RELATIONSHIPS } from '../../inventory';
import {
  CONDITION_KIND_OPTIONS,
  conditionKindHint,
  conditionNoteLabel,
  conditionSummary,
  INSTITUTION_TYPE_LABELS,
  INSTITUTION_TYPE_OPTIONS,
  RELATIONSHIP_OPTIONS,
  relationshipLabel,
  beneficiarySubtitle,
  contingencyLabel,
  contingencyOptionsFor,
  contingencyQuestion,
} from '../labels';

describe('relationshipLabel', () => {
  it('writes a listed relationship in words', () => {
    expect(relationshipLabel({ relationship: 'in_law', relationshipOther: null })).toBe('In-law');
    expect(relationshipLabel({ relationship: 'grandchild', relationshipOther: null })).toBe(
      'Grandchild'
    );
  });

  it('shows what was typed for "other", and nothing for an organisation', () => {
    expect(relationshipLabel({ relationship: 'other', relationshipOther: 'Godmother' })).toBe(
      'Godmother'
    );
    expect(relationshipLabel({ relationship: 'other', relationshipOther: null })).toBe('Other');
    expect(relationshipLabel({ relationship: null, relationshipOther: null })).toBe('');
  });
});

describe('RELATIONSHIP_OPTIONS', () => {
  it('lists every relationship the server accepts, each with its own label', () => {
    const values = RELATIONSHIP_OPTIONS.map(o => o.value);
    expect(values).toEqual([...RELATIONSHIPS]);
    expect(new Set(RELATIONSHIP_OPTIONS.map(o => o.label)).size).toBe(RELATIONSHIPS.length);
    expect(values[values.length - 1]).toBe('other');
  });
});

describe('beneficiarySubtitle', () => {
  it('shows how a person is related to you', () => {
    expect(
      beneficiarySubtitle({
        relationship: 'daughter',
        relationshipOther: null,
        institutionType: null,
      })
    ).toBe('Daughter');
  });

  it('shows what kind of organisation it is', () => {
    expect(
      beneficiarySubtitle({
        relationship: null,
        relationshipOther: null,
        institutionType: 'church',
      })
    ).toBe('Church');
    expect(
      beneficiarySubtitle({
        relationship: null,
        relationshipOther: null,
        institutionType: 'orphanage',
      })
    ).toBe('Orphanage');
    expect(
      beneficiarySubtitle({ relationship: null, relationshipOther: null, institutionType: 'other' })
    ).toBe('Other organisation');
  });
});

describe('INSTITUTION_TYPE_OPTIONS', () => {
  it('lists every type the server accepts, orphanage included, with "other" last', () => {
    const values = INSTITUTION_TYPE_OPTIONS.map(o => o.value);
    expect(values).toEqual([...INSTITUTION_TYPES]);
    expect(values).toContain('orphanage');
    expect(values).toHaveLength(14);
    expect(values[values.length - 1]).toBe('other');
  });
});

describe('INSTITUTION_TYPE_LABELS', () => {
  it('has a distinct, non-empty label for every type', () => {
    const labels = INSTITUTION_TYPES.map(t => INSTITUTION_TYPE_LABELS[t]);
    expect(labels.every(Boolean)).toBe(true);
    expect(new Set(labels).size).toBe(INSTITUTION_TYPES.length);
  });
});

describe('contingencyOptionsFor', () => {
  const values = (kind: 'person' | 'institution') => contingencyOptionsFor(kind).map(o => o.value);

  it('offers every plan for a person', () => {
    expect(values('person')).toEqual([
      'unset',
      'redistribute',
      'pass_to_descendants',
      'named_beneficiary',
    ]);
  });

  it('never offers "pass to their children" for an organisation', () => {
    expect(values('institution')).toEqual(['unset', 'redistribute', 'named_beneficiary']);
  });
});

describe('contingencyQuestion', () => {
  it('asks about death for a person and about ceasing to exist for an organisation', () => {
    expect(contingencyQuestion('person')).toBe('If they die before you');
    expect(contingencyQuestion('institution')).toBe('If it no longer exists');
  });
});

describe('contingencyLabel', () => {
  it('reads "Not decided yet" when no plan is chosen', () => {
    const b = { contingencyPlan: null } as Parameters<typeof contingencyLabel>[0];
    expect(contingencyLabel(b)).toBe('Not decided yet');
  });
});

describe('conditionSummary', () => {
  const names = { holder: 'Barr. Adeyemi', fallback: 'Chidi Obi' };
  const base = { minAge: '', days: '', text: '', ifUnmet: 'redistribute' as const };

  it('reads as one plain sentence for an age', () => {
    const c = {
      ...base,
      kind: 'min_age' as const,
      minAge: 25,
      ifUnmet: 'named_beneficiary' as const,
    };
    expect(conditionSummary(c, names)).toBe(
      'Only at age 25. Held by Barr. Adeyemi. If it is not met, it goes to Chidi Obi.'
    );
  });

  it.each([
    ['marriage', {}, 'Only if they marry'],
    ['education', {}, 'Only when they finish their education'],
    ['nysc', {}, 'Only when they complete National Youth Service (NYSC)'],
    ['survives', { days: 30 }, 'Only if they outlive me by 30 days'],
    ['survives', { days: '1' }, 'Only if they outlive me by 1 day'],
    ['other', { text: ' she finishes her degree ' }, 'Only when she finishes her degree'],
  ] as const)('describes %s', (kind, extra, phrase) => {
    expect(conditionSummary({ ...base, kind, ...extra }, names)).toBe(
      `${phrase}. Held by Barr. Adeyemi. If it is not met, it is shared among my other beneficiaries.`
    );
  });

  it('adds the free-text note in brackets, on every kind except "other"', () => {
    const c = { ...base, kind: 'education' as const, text: ' University of Lagos ' };
    expect(conditionSummary(c, names)).toBe(
      'Only when they finish their education (University of Lagos). Held by Barr. Adeyemi. If it is not met, it is shared among my other beneficiaries.'
    );
  });

  it('describes each "if unmet" plan', () => {
    const c = { ...base, kind: 'marriage' as const };
    expect(conditionSummary({ ...c, ifUnmet: 'residuary' }, names)).toMatch(
      /goes into "everything else"/
    );
    expect(conditionSummary({ ...c, ifUnmet: 'named_beneficiary' }, names)).toMatch(
      /goes to Chidi Obi/
    );
  });
});

describe('condition kinds', () => {
  it('offers every kind the server accepts, each once, with "other" last', () => {
    const values = CONDITION_KIND_OPTIONS.map(o => o.value);
    expect(values).toEqual([...CONDITION_KINDS]);
    expect(new Set(CONDITION_KIND_OPTIONS.map(o => o.label)).size).toBe(CONDITION_KINDS.length);
    expect(values[values.length - 1]).toBe('other');
  });

  it('warns that a lawyer will check marriage and free-text conditions only', () => {
    expect(conditionKindHint('marriage')).toMatch(/lawyer will check/);
    expect(conditionKindHint('other')).toMatch(/lawyer will check/);
    expect(conditionKindHint('min_age')).toBeNull();
  });

  it('asks for the right thing in the note', () => {
    expect(conditionNoteLabel('education')).toMatch(/course or institution/);
    expect(conditionNoteLabel('other')).toBe('What has to happen first?');
    expect(conditionNoteLabel('marriage')).toMatch(/optional/);
  });
});
