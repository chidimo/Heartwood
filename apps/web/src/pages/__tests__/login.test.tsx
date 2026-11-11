import { beforeEach, describe, expect, it, vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { createMemoryHistory, RouterProvider } from '@tanstack/react-router';

const toastError = vi.hoisted(() => vi.fn());
vi.mock('sonner', () => ({ toast: { error: toastError, success: vi.fn() }, Toaster: () => null }));

import { AuthProvider } from '../../auth/auth-context';
import { createAppRouter } from '../../router';

const json = (status: number, body: unknown) => new Response(JSON.stringify(body), { status });

const renderApp = async () => {
  const router = createAppRouter(createMemoryHistory({ initialEntries: ['/login'] }));
  render(
    <QueryClientProvider client={new QueryClient()}>
      <AuthProvider>
        <RouterProvider router={router} />
      </AuthProvider>
    </QueryClientProvider>
  );
};

beforeEach(() => {
  localStorage.clear();
  toastError.mockClear();
});

describe('sign in', () => {
  it('shows the sign-in page to a signed-out visitor', async () => {
    vi.stubGlobal('fetch', vi.fn());
    await renderApp();
    expect(await screen.findByText('Sign in to your inventory.')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Sign in' })).toBeDisabled();
  });

  it('toasts the server message when sign-in fails', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue(json(401, { error: 'Wrong email or password' }))
    );
    await renderApp();
    await userEvent.type(await screen.findByLabelText('Email'), 'a@example.com');
    await userEvent.type(screen.getByLabelText('Password'), 'nope-nope-1');
    await userEvent.click(screen.getByRole('button', { name: 'Sign in' }));
    await waitFor(() => expect(toastError).toHaveBeenCalledWith('Wrong email or password'));
  });

  it('on success lands on the assets list', async () => {
    const account = { id: 'a', name: 'Tester', email: 'a@example.com' };
    vi.stubGlobal(
      'fetch',
      vi.fn(async (url: string) => {
        if (url.endsWith('/auth/login')) {
          return json(200, { accessToken: 'x', refreshToken: 'y', account });
        }
        if (url.includes('/assets')) {
          return json(200, { items: [], page: 1, limit: 10, total: 0, totalPages: 1 });
        }
        return json(200, []);
      })
    );
    await renderApp();
    await userEvent.type(await screen.findByLabelText('Email'), 'a@example.com');
    await userEvent.type(screen.getByLabelText('Password'), 'right-password-1');
    await userEvent.click(screen.getByRole('button', { name: 'Sign in' }));
    expect(
      await screen.findByText('No assets yet. Add the first thing you own.')
    ).toBeInTheDocument();
    expect(localStorage.getItem('heartwood.refreshToken')).toBe('y');
  });
});
