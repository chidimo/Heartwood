import { useState } from 'react';
import type { ReactNode } from 'react';
import { Navigate, Outlet } from '@tanstack/react-router';
import { Menu } from 'lucide-react';
import { useAuth } from '../auth/use-auth';
import { Sidebar } from './sidebar';

export const Heading = ({ children }: { children: ReactNode }) => (
  <h1 className="text-2xl font-semibold">{children}</h1>
);

/** Signed-in pages: redirects to sign-in when there is no session. */
export const AppLayout = () => {
  const { status, account, signOut } = useAuth();
  const [isNavOpen, setIsNavOpen] = useState(false);

  if (status === 'loading') {
    return (
      <p role="status" className="p-6">
        Loading…
      </p>
    );
  }
  if (status === 'signedOut') return <Navigate to="/login" />;

  const handleSignOut = () => {
    setIsNavOpen(false);
    void signOut();
  };

  return (
    <div className="min-h-screen">
      <Sidebar
        isOpen={isNavOpen}
        onClose={() => setIsNavOpen(false)}
        name={account?.name}
        email={account?.email}
        onSignOut={handleSignOut}
      />
      <header className="sticky top-0 z-20 print:hidden flex h-14 items-center gap-3 border-b border-primary-600/20 bg-white/90 px-4 backdrop-blur lg:hidden dark:bg-ink/90">
        <button
          type="button"
          onClick={() => setIsNavOpen(true)}
          aria-label="Open navigation"
          className="rounded-lg p-2 hover:bg-primary-600/10"
        >
          <Menu className="h-5 w-5" aria-hidden />
        </button>
        <span className="text-lg font-semibold text-primary-700 dark:text-primary-200">
          Heartwood
        </span>
      </header>
      <main className="py-6 lg:pl-64 print:py-0 print:pl-0">
        <div className="mx-auto flex max-w-3xl flex-col gap-5 px-4 sm:px-6">
          <Outlet />
        </div>
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
