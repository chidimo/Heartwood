import { ApiError, Unreachable, apiFetch, errorMessage } from '../client';

const respond = (status: number, body: unknown) =>
  jest.spyOn(globalThis, 'fetch').mockResolvedValue({
    ok: status >= 200 && status < 300,
    status,
    json: () => Promise.resolve(body),
  } as Response);

afterEach(() => jest.restoreAllMocks());

describe('apiFetch', () => {
  it('returns the parsed body on success', async () => {
    respond(200, { status: 'ok' });
    await expect(apiFetch('/health')).resolves.toEqual({ status: 'ok' });
  });

  it("throws ApiError carrying the server's message", async () => {
    respond(404, { error: 'Not found' });
    await expect(apiFetch('/x')).rejects.toMatchObject({ message: 'Not found', status: 404 });
  });

  it('throws Unreachable when the request gets no answer', async () => {
    jest.spyOn(globalThis, 'fetch').mockRejectedValue(new TypeError('Network request failed'));
    await expect(apiFetch('/x')).rejects.toBeInstanceOf(Unreachable);
  });
});

describe('errorMessage', () => {
  it('shows ApiError messages and hides everything else behind the fallback', () => {
    expect(errorMessage(new ApiError('Nope', 400))).toBe('Nope');
    expect(errorMessage(new Error('stack trace noise'), 'Fallback')).toBe('Fallback');
  });
});
