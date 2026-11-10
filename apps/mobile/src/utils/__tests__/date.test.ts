import { dateFromIso, formatDateInput, formatLongDate, isoFromDate, parseDateInput } from '../date';

describe('parseDateInput', () => {
  it.each([
    ['15/06/2012', '2012-06-15'],
    ['5/6/2012', '2012-06-05'],
    [' 01/01/1990 ', '1990-01-01'],
    ['29/02/2024', '2024-02-29'],
  ])('reads %p as %p', (text, iso) => expect(parseDateInput(text)).toBe(iso));

  it.each([
    '',
    '2012-06-15',
    '31/02/2024',
    '29/02/2023',
    '15/13/2012',
    '0/1/2012',
    '15/06/12',
    'soon',
  ])('rejects %p', text => expect(parseDateInput(text)).toBeNull());
});

describe('formatDateInput', () => {
  it('writes day first', () => expect(formatDateInput('2012-06-15')).toBe('15/06/2012'));

  it('round-trips with parseDateInput', () => {
    expect(parseDateInput(formatDateInput('1999-12-31'))).toBe('1999-12-31');
  });
});

describe('isoFromDate and dateFromIso', () => {
  it('round-trip without shifting the day, in any timezone', () => {
    for (const iso of ['2012-06-15', '2024-02-29', '1999-12-31', '2000-01-01']) {
      expect(isoFromDate(dateFromIso(iso))).toBe(iso);
    }
  });

  it('read the date a picker returns by its local calendar day', () => {
    expect(isoFromDate(new Date(2012, 5, 15, 23, 59))).toBe('2012-06-15');
    expect(isoFromDate(new Date(2012, 5, 15, 0, 1))).toBe('2012-06-15');
  });
});

describe('formatLongDate', () => {
  it('writes the day, the month in words and the year', () => {
    expect(formatLongDate('2012-06-15')).toBe('15 June 2012');
    expect(formatLongDate('2000-01-01')).toBe('1 January 2000');
    expect(formatLongDate('1999-12-31')).toBe('31 December 1999');
  });
});
