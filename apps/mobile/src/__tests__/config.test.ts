import { resolveApiUrl } from '../config';

describe('resolveApiUrl', () => {
  const local = 'http://localhost:4300';

  it('keeps a deployed URL and strips a trailing slash', () => {
    expect(resolveApiUrl('https://api.example.com/', 'ios')).toBe('https://api.example.com');
  });

  it('leaves localhost alone on web and on the iOS simulator', () => {
    expect(resolveApiUrl(local, 'web', '192.168.1.5:8081')).toBe(local);
    expect(resolveApiUrl(local, 'ios', 'localhost:8081')).toBe(local);
  });

  it('swaps in the Metro host for a physical phone', () => {
    expect(resolveApiUrl(local, 'ios', '192.168.1.5:8081')).toBe('http://192.168.1.5:4300');
  });

  it('uses 10.0.2.2 for the Android emulator', () => {
    expect(resolveApiUrl(local, 'android', 'localhost:8081')).toBe('http://10.0.2.2:4300');
  });
});
