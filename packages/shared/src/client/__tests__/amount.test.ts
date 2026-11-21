import { formatValue } from '../asset-labels';
import { amountToInput, cleanAmountInput, padAmountInput, parseAmount } from '../amount';

describe('cleanAmountInput', () => {
  it.each([
    ['1250', '1,250'],
    ['1250.5', '1,250.5'],
    ['1250.555', '1,250.55'],
    ['1250.', '1,250.'],
    ['.5', '0.5'],
    ['abc12x', '12'],
    ['1.2.3', '1.23'],
    ['007', '7'],
    ['', ''],
  ])('turns %p into %p', (text, expected) => expect(cleanAmountInput(text)).toBe(expected));
});

describe('padAmountInput', () => {
  it.each([
    ['1,250.5', '1,250.50'],
    ['1250', '1,250.00'],
    ['1250.', '1,250.00'],
    ['', ''],
  ])('turns %p into %p', (text, expected) => expect(padAmountInput(text)).toBe(expected));
});

describe('amountToInput and parseAmount', () => {
  it('round-trips', () => {
    expect(amountToInput(45000000)).toBe('45,000,000.00');
    expect(amountToInput(null)).toBe('');
    expect(parseAmount('45,000,000.50')).toBe(45000000.5);
    expect(parseAmount('')).toBeNull();
  });
});

describe('formatValue', () => {
  it('shows cents only when there are some, in the asset currency', () => {
    expect(formatValue(45000000)).toBe('₦45,000,000');
    expect(formatValue(3250000.5)).toBe('₦3,250,000.50');
    expect(formatValue(18400.75, 'USD')).toBe('US$18,400.75');
    expect(formatValue(null)).toBe('Value not set');
  });
});
