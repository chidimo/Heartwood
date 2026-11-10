import { INSTITUTION_TYPES, RELATIONSHIPS } from '@heartwood/shared';
import {
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

  it('reads as one plain sentence for an age', () => {
    const c = {
      kind: 'min_age' as const,
      minAge: 25,
      text: '',
      ifUnmet: 'named_beneficiary' as const,
    };
    expect(conditionSummary(c, names)).toBe(
      'Only at age 25. Held by Barr. Adeyemi. If it is not met, it goes to Chidi Obi.'
    );
  });

  it('quotes the free text and describes each fallback plan', () => {
    const other = {
      kind: 'other' as const,
      minAge: '',
      text: ' she finishes her degree ',
      ifUnmet: 'redistribute' as const,
    };
    expect(conditionSummary(other, names)).toBe(
      'Only when she finishes her degree. Held by Barr. Adeyemi. If it is not met, it is shared among my other beneficiaries.'
    );
    expect(conditionSummary({ ...other, ifUnmet: 'residuary' }, names)).toMatch(
      /goes into "everything else"/
    );
  });
});
