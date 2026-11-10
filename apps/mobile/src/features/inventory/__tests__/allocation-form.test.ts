import type { AllocationDto } from '@heartwood/shared';
import {
  allocationFormProblem,
  emptyForm,
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
      { beneficiaryId: A, sharePercent: 70, specificBequest: null },
      { beneficiaryId: C, sharePercent: 30, specificBequest: null },
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
      { beneficiaryId: A, sharePercent: null, specificBequest: 'The Camry' },
    ]);
  });
});

describe('formFromAllocations', () => {
  it('rebuilds a split', () => {
    const allocations: AllocationDto[] = [
      { beneficiaryId: A, sharePercent: 50, specificBequest: null },
      { beneficiaryId: B, sharePercent: 50, specificBequest: null },
    ];
    expect(formFromAllocations(allocations)).toMatchObject({
      mode: 'split',
      shares: { [A]: '50', [B]: '50' },
    });
  });

  it('rebuilds a bequest', () => {
    const form = formFromAllocations([
      { beneficiaryId: A, sharePercent: null, specificBequest: 'The Camry' },
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
