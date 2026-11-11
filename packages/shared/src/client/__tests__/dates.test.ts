import {
  dateFromIso,
  formatDateInput,
  formatLongDate,
  formatTimestamp,
  isoFromDate,
  parseDateInput,
} from '../dates';

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
  it('writes the weekday, the day, the month in words and the year', () => {
    expect(formatLongDate('2012-06-15')).toBe('Friday, 15 June 2012');
    expect(formatLongDate('2000-01-01')).toBe('Saturday, 1 January 2000');
    expect(formatLongDate('1999-12-31')).toBe('Friday, 31 December 1999');
  });

  it('gets the weekday right on a leap day and across a year end', () => {
    expect(formatLongDate('2024-02-29')).toBe('Thursday, 29 February 2024');
    expect(formatLongDate('2026-11-11')).toBe('Wednesday, 11 November 2026');
  });
});

describe('formatTimestamp', () => {
  it('reads as weekday, date, year and time to the second, in Lagos time', () => {
    // 13:32:09 UTC is 14:32:09 in Lagos (UTC+1, no daylight saving).
    expect(formatTimestamp(new Date('2026-11-11T13:32:09Z'))).toBe(
      'Wednesday, 11 November 2026 at 2:32:09 pm'
    );
  });

  it('uses a 12-hour clock with am or pm, and pads the minute and the second only', () => {
    expect(formatTimestamp(new Date('2026-03-02T07:04:05Z'))).toBe(
      'Monday, 2 March 2026 at 8:04:05 am'
    );
  });

  it('says noon as 12 pm and the small hours as am', () => {
    expect(formatTimestamp(new Date('2026-11-11T11:00:00Z'))).toBe(
      'Wednesday, 11 November 2026 at 12:00:00 pm'
    );
    expect(formatTimestamp(new Date('2026-11-11T02:20:30Z'))).toBe(
      'Wednesday, 11 November 2026 at 3:20:30 am'
    );
  });

  it('moves to the next day when Lagos is already past midnight', () => {
    expect(formatTimestamp(new Date('2026-11-11T23:05:00Z'))).toBe(
      'Thursday, 12 November 2026 at 12:05:00 am'
    );
  });
});
