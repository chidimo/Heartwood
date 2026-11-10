import { formatDateInput, parseDateInput } from '../date';

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
