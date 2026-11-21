import { cn } from '../cn';

describe('cn', () => {
  it('joins strings and skips falsy values', () => {
    expect(cn('a', false, null, undefined, 'b')).toBe('a b');
  });

  it('adds object keys whose condition is true', () => {
    expect(cn('base', { on: true, off: false, unset: undefined })).toBe('base on');
  });

  it('returns an empty string for nothing', () => {
    expect(cn()).toBe('');
  });
});
