import type { ReactNode } from 'react';
import { Link, Navigate, Outlet } from '@tanstack/react-router';
import { useAuth } from '../auth/use-auth';
import { Button } from './button';

const NAV = [
  { to: '/assets', label: 'Assets' },
  { to: '/people', label: 'People' },
  { to: '/review', label: 'Review' },
] as const;

export const Heading = ({ children }: { children: ReactNode }) => (
  <h1 className="text-2xl font-semibold">{children}</h1>
);

/** Signed-in pages: redirects to sign-in when there is no session. */
export const AppLayout = () => {
  const { status, account, signOut } = useAuth();

  if (status === 'loading') {
    return (
      <p role="status" className="p-6">
        Loading…
      </p>
    );
  }
  if (status === 'signedOut') return <Navigate to="/login" />;

  return (
    <div className="min-h-screen">
      <header className="border-b border-primary-600/20">
        <div className="mx-auto flex max-w-3xl flex-wrap items-center gap-4 px-6 py-3">
          <span className="text-lg font-semibold text-primary-700 dark:text-primary-200">
            Heartwood
          </span>
          <nav aria-label="Main" className="flex flex-1 gap-4">
            {NAV.map(item => (
              <Link
                key={item.to}
                to={item.to}
                className="text-ink/70 hover:text-ink dark:text-white/70 dark:hover:text-white"
                activeProps={{ className: 'font-semibold text-primary-700 dark:text-primary-200' }}
              >
                {item.label}
              </Link>
            ))}
          </nav>
          <span className="text-sm text-ink/60 dark:text-white/60">{account?.name}</span>
          <Button variant="link" onClick={() => void signOut()}>
            Sign out
          </Button>
        </div>
      </header>
      <main className="mx-auto flex max-w-3xl flex-col gap-5 px-6 py-6">
        <Outlet />
      </main>
    </div>
  );
};

/** Sign-in and register: a centred card, and back to the app when already signed in. */
export const AuthShell = ({ title, children }: { title: string; children: ReactNode }) => {
  const { status } = useAuth();
  if (status === 'signedIn') return <Navigate to="/assets" />;
  return (
    <main className="mx-auto flex min-h-screen max-w-md flex-col justify-center gap-5 px-6">
      <h1 className="text-3xl font-semibold text-primary-700 dark:text-primary-200">Heartwood</h1>
      <p className="text-ink/70 dark:text-white/70">{title}</p>
      {children}
    </main>
  );
};
