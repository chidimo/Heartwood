import { INSTITUTION_TYPES } from '@heartwood/shared';
import {
  INSTITUTION_TYPE_LABELS,
  INSTITUTION_TYPE_OPTIONS,
  beneficiarySubtitle,
  contingencyLabel,
  contingencyOptionsFor,
  contingencyQuestion,
} from '../labels';

describe('beneficiarySubtitle', () => {
  it('shows how a person is related to you', () => {
    expect(beneficiarySubtitle({ relationship: 'Daughter', institutionType: null })).toBe(
      'Daughter'
    );
  });

  it('shows what kind of organisation it is', () => {
    expect(beneficiarySubtitle({ relationship: null, institutionType: 'church' })).toBe('Church');
    expect(beneficiarySubtitle({ relationship: null, institutionType: 'orphanage' })).toBe(
      'Orphanage'
    );
    expect(beneficiarySubtitle({ relationship: null, institutionType: 'other' })).toBe(
      'Other organisation'
    );
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
