import type { AllocationDto } from '../../inventory';
import {
  allocationFormProblem,
  conditionProblem,
  conditionToApi,
  emptyForm,
  newCondition,
  recipientIds,
  formFromAllocations,
  formatTotal,
  parsePercent,
  residuaryFormProblem,
  splitEvenly,
  toAllocationEntries,
  totalHundredths,
} from '../allocation-form';

const A = '11111111-1111-4111-8111-111111111111';
const B = '22222222-2222-4222-8222-222222222222';
const C = '33333333-3333-4333-8333-333333333333';

describe('parsePercent', () => {
  it.each([
    ['50', 50],
    ['33.33', 33.33],
    [' 12.5 ', 12.5],
  ])('reads %p as %p', (text, value) => expect(parsePercent(text)).toBe(value));

  it('treats blank as "not included"', () => expect(parsePercent('  ')).toBeNull());

  it.each(['abc', '33.333', '-5', '1,5', '5%'])('rejects %p', text =>
    expect(parsePercent(text)).toBeNaN()
  );
});

describe('totals', () => {
  it('adds in hundredths so floating point cannot drift', () => {
    expect(totalHundredths({ [A]: '33.33', [B]: '33.33', [C]: '33.34' })).toBe(10000);
    expect(totalHundredths({ [A]: '0.1', [B]: '0.2' })).toBe(30);
  });

  it('ignores blank, zero and invalid entries', () => {
    expect(totalHundredths({ [A]: '', [B]: '0', [C]: 'x' })).toBe(0);
  });

  it('formats without trailing zeros', () => {
    expect(formatTotal({ [A]: '60', [B]: '40' })).toBe('100%');
    expect(formatTotal({ [A]: '33.33' })).toBe('33.33%');
    expect(formatTotal({})).toBe('0%');
  });
});

describe('allocationFormProblem', () => {
  const split = (shares: Record<string, string>) => ({ ...emptyForm, shares });

  it('accepts shares totalling exactly 100%', () => {
    expect(allocationFormProblem(split({ [A]: '60', [B]: '40' }))).toBeNull();
  });

  it('rejects a total that is not 100%', () => {
    expect(allocationFormProblem(split({ [A]: '60', [B]: '39.99' }))).toBe(
      'Shares must total exactly 100%'
    );
  });

  it('accepts an empty form: it clears the allocation', () => {
    expect(allocationFormProblem(emptyForm)).toBeNull();
  });

  it('rejects text that is not a percentage', () => {
    expect(allocationFormProblem(split({ [A]: 'half' }))).toMatch(/numbers like/);
  });

  it('needs both a person and a description for a specific bequest', () => {
    const bequest = { ...emptyForm, mode: 'bequest' as const };
    expect(allocationFormProblem({ ...bequest, bequestBeneficiaryId: A })).toMatch(/Choose who/);
    expect(allocationFormProblem({ ...bequest, bequestText: 'The car' })).toMatch(/Choose who/);
    expect(
      allocationFormProblem({ ...bequest, bequestBeneficiaryId: A, bequestText: 'The car' })
    ).toBeNull();
  });
});

describe('toAllocationEntries', () => {
  it('sends only people with a share, as shares', () => {
    const entries = toAllocationEntries({
      ...emptyForm,
      shares: { [A]: '70', [B]: '', [C]: '30' },
    });
    expect(entries).toEqual([
      { beneficiaryId: A, sharePercent: 70, specificBequest: null, condition: null },
      { beneficiaryId: C, sharePercent: 30, specificBequest: null, condition: null },
    ]);
  });

  it('sends a single specific bequest', () => {
    const entries = toAllocationEntries({
      ...emptyForm,
      mode: 'bequest',
      bequestBeneficiaryId: A,
      bequestText: '  The Camry  ',
    });
    expect(entries).toEqual([
      { beneficiaryId: A, sharePercent: null, specificBequest: 'The Camry', condition: null },
    ]);
  });
});

describe('formFromAllocations', () => {
  it('rebuilds a split', () => {
    const allocations: AllocationDto[] = [
      { beneficiaryId: A, sharePercent: 50, specificBequest: null, condition: null },
      { beneficiaryId: B, sharePercent: 50, specificBequest: null, condition: null },
    ];
    expect(formFromAllocations(allocations)).toMatchObject({
      mode: 'split',
      shares: { [A]: '50', [B]: '50' },
    });
  });

  it('rebuilds a bequest', () => {
    const form = formFromAllocations([
      { beneficiaryId: A, sharePercent: null, specificBequest: 'The Camry', condition: null },
    ]);
    expect(form).toMatchObject({
      mode: 'bequest',
      bequestBeneficiaryId: A,
      bequestText: 'The Camry',
    });
  });

  it('is an empty split when nothing is allocated', () => {
    expect(formFromAllocations([])).toEqual(emptyForm);
  });
});

describe('splitEvenly', () => {
  it('gives any leftover hundredths to the first people so the total is exactly 100%', () => {
    const shares = splitEvenly([A, B, C]);
    expect(shares).toEqual({ [A]: '33.34', [B]: '33.33', [C]: '33.33' });
    expect(totalHundredths(shares)).toBe(10000);
  });

  it.each([1, 2, 3, 4, 6, 7, 9])('totals exactly 100%% for %i people', n => {
    const ids = Array.from({ length: n }, (_, i) => `id-${i}`);
    expect(totalHundredths(splitEvenly(ids))).toBe(10000);
  });

  it('is empty for nobody', () => expect(splitEvenly([])).toEqual({}));
});

describe('residuaryFormProblem', () => {
  it('uses the same rule', () => {
    expect(residuaryFormProblem({ [A]: '100' })).toBeNull();
    expect(residuaryFormProblem({ [A]: '90' })).toBe('Shares must total exactly 100%');
    expect(residuaryFormProblem({})).toBeNull();
  });
});

const HOLDER = '99999999-9999-4999-8999-999999999999';

describe('conditionProblem', () => {
  const valid = { ...newCondition(HOLDER), minAge: '25' };

  it('accepts a complete age condition', () => expect(conditionProblem(valid, A)).toBeNull());

  it.each(['', '0', '101', 'abc', '24.5', '-3'])('rejects an age of %p', minAge => {
    expect(conditionProblem({ ...valid, minAge }, A)).toBe('Enter an age between 1 and 100.');
  });

  it.each(['', '0', '366', 'abc', '1.5'])('rejects %p days for "outlive me"', days => {
    const c = { ...valid, kind: 'survives' as const, days };
    expect(conditionProblem(c, A)).toBe('Enter a number of days between 1 and 365.');
  });

  it('accepts a valid number of days', () => {
    expect(conditionProblem({ ...valid, kind: 'survives', days: '30' }, A)).toBeNull();
  });

  it.each(['marriage', 'education', 'nysc'] as const)(
    '%s needs nothing else: the note is optional',
    kind => {
      expect(conditionProblem({ ...valid, kind }, A)).toBeNull();
      expect(conditionProblem({ ...valid, kind, text: 'University of Lagos' }, A)).toBeNull();
    }
  );

  it('keeps a note under 500 characters', () => {
    expect(conditionProblem({ ...valid, kind: 'marriage', text: 'x'.repeat(501) }, A)).toBe(
      'Keep it under 500 characters.'
    );
  });

  it('needs words for a free-text condition', () => {
    const other = { ...valid, kind: 'other' as const, text: '   ' };
    expect(conditionProblem(other, A)).toBe('Describe what has to happen first.');
    expect(conditionProblem({ ...other, text: 'finishes her degree' }, A)).toBeNull();
  });

  it('needs a holder', () => {
    expect(conditionProblem({ ...valid, holderId: '' }, A)).toMatch(/who will hold it/);
  });

  it('needs a fallback person only when the plan names one, and never the person the gift is for', () => {
    const named = { ...valid, ifUnmet: 'named_beneficiary' as const };
    expect(conditionProblem(named, A)).toMatch(/who receives it/);
    expect(conditionProblem({ ...named, fallbackId: A }, A)).toMatch(/fall back to the person/);
    expect(conditionProblem({ ...named, fallbackId: B }, A)).toBeNull();
  });
});

describe('conditionToApi for every kind', () => {
  const holder = { holderId: HOLDER, ifUnmet: 'redistribute', fallbackBeneficiaryId: null };

  it.each([
    ['marriage', { kind: 'marriage', text: null }],
    ['education', { kind: 'education', text: null }],
    ['nysc', { kind: 'nysc', text: null }],
  ] as const)('%s with no note', (kind, expected) => {
    expect(conditionToApi({ ...newCondition(HOLDER), kind })).toEqual({ ...expected, ...holder });
  });

  it('keeps a trimmed note, or none when it is blank', () => {
    const base = { ...newCondition(HOLDER), kind: 'education' as const };
    expect(conditionToApi({ ...base, text: '  University of Lagos ' })).toMatchObject({
      text: 'University of Lagos',
    });
    expect(conditionToApi({ ...base, text: '   ' })).toMatchObject({ text: null });
  });

  it('converts "outlive me" to a number of days, and an age to a number', () => {
    expect(conditionToApi({ ...newCondition(HOLDER), kind: 'survives', days: '30' })).toMatchObject(
      {
        kind: 'survives',
        days: 30,
      }
    );
    expect(conditionToApi({ ...newCondition(HOLDER), minAge: '21' })).toMatchObject({
      kind: 'min_age',
      minAge: 21,
    });
  });

  it('round-trips every kind through the saved form', () => {
    const saved = [
      { kind: 'marriage' as const, text: 'to someone my executor approves' },
      { kind: 'education' as const, text: 'University of Lagos' },
      { kind: 'nysc' as const, text: null },
      { kind: 'survives' as const, days: 30, text: null },
      { kind: 'min_age' as const, minAge: 25, text: null },
      { kind: 'other' as const, text: 'she looks after my mother' },
    ].map(c => ({ ...c, ...holder, ifUnmet: 'redistribute' as const }));
    for (const condition of saved) {
      const form = formFromAllocations([
        { beneficiaryId: A, sharePercent: 100, specificBequest: null, condition },
      ]);
      expect(toAllocationEntries(form)[0].condition).toEqual(condition);
    }
  });
});

describe('conditionToApi', () => {
  it('converts an age condition, dropping a fallback the plan does not use', () => {
    const c = { ...newCondition(HOLDER), minAge: '25', fallbackId: B };
    expect(conditionToApi(c)).toEqual({
      kind: 'min_age',
      minAge: 25,
      text: null,
      ifUnmet: 'redistribute',
      fallbackBeneficiaryId: null,
      holderId: HOLDER,
    });
  });

  it('converts a free-text condition with a named fallback, trimming the text', () => {
    const c = {
      ...newCondition(HOLDER),
      kind: 'other' as const,
      text: '  finishes her degree ',
      ifUnmet: 'named_beneficiary' as const,
      fallbackId: B,
    };
    expect(conditionToApi(c)).toEqual({
      kind: 'other',
      text: 'finishes her degree',
      ifUnmet: 'named_beneficiary',
      fallbackBeneficiaryId: B,
      holderId: HOLDER,
    });
  });
});

describe('conditions in the allocation form', () => {
  const age25 = { ...newCondition(HOLDER), minAge: '25' };

  it('attaches a condition to the right person, and only to people who receive something', () => {
    const form = {
      ...emptyForm,
      shares: { [A]: '60', [B]: '40' },
      conditions: { [A]: age25, [C]: age25 },
    };
    const entries = toAllocationEntries(form);
    expect(entries.find(e => e.beneficiaryId === A)?.condition).toMatchObject({
      kind: 'min_age',
      minAge: 25,
    });
    expect(entries.find(e => e.beneficiaryId === B)?.condition).toBeNull();
    expect(entries.map(e => e.beneficiaryId)).not.toContain(C);
  });

  it('blocks saving while a condition is unfinished, and says why', () => {
    const form = {
      ...emptyForm,
      shares: { [A]: '100' },
      conditions: { [A]: { ...age25, minAge: '' } },
    };
    expect(allocationFormProblem(form)).toBe(
      'A condition is unfinished. Enter an age between 1 and 100.'
    );
  });

  it('ignores an unfinished condition on someone who gets nothing', () => {
    const form = {
      ...emptyForm,
      shares: { [A]: '100' },
      conditions: { [B]: { ...age25, minAge: '' } },
    };
    expect(allocationFormProblem(form)).toBeNull();
  });

  it('applies to a specific bequest too', () => {
    const form = {
      ...emptyForm,
      mode: 'bequest' as const,
      bequestBeneficiaryId: A,
      bequestText: 'The Camry',
      conditions: { [A]: age25 },
    };
    expect(allocationFormProblem(form)).toBeNull();
    expect(toAllocationEntries(form)[0].condition).toMatchObject({ kind: 'min_age', minAge: 25 });
    expect(recipientIds(form)).toEqual([A]);
  });

  it('round-trips through the saved allocation', () => {
    const saved = [
      {
        beneficiaryId: A,
        sharePercent: 100,
        specificBequest: null,
        condition: {
          kind: 'other' as const,
          text: 'finishes her degree',
          ifUnmet: 'named_beneficiary' as const,
          fallbackBeneficiaryId: B,
          holderId: HOLDER,
        },
      },
    ];
    const form = formFromAllocations(saved);
    expect(form.conditions[A]).toMatchObject({
      kind: 'other',
      text: 'finishes her degree',
      fallbackId: B,
    });
    expect(toAllocationEntries(form)).toEqual([{ ...saved[0] }]);
  });
});
