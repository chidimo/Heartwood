import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { RouterProvider } from '@tanstack/react-router';
import { Toaster } from 'sonner';
import './styles.css';
import { AuthProvider } from './auth/auth-context';
import { router } from './router';

const RETRY_ATTEMPTS = 3;

// Retrying a 4xx just repeats the same client error; retry only network failures
// and 5xx, up to RETRY_ATTEMPTS.
const shouldRetry = (failureCount: number, error: unknown) => {
  const status = (error as { response?: { status?: number } } | undefined)?.response?.status;
  if (status !== undefined && status >= 400 && status < 500) return false;
  return failureCount < RETRY_ATTEMPTS;
};

const queryClient = new QueryClient({
  defaultOptions: { queries: { staleTime: 30_000, retry: shouldRetry } },
});

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <QueryClientProvider client={queryClient}>
      <Toaster richColors position="top-right" />
      <AuthProvider>
        <RouterProvider router={router} />
      </AuthProvider>
    </QueryClientProvider>
  </StrictMode>
);
