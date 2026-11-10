import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import type { ReactNode } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import type { AuthResponse, PublicAccount } from '@heartwood/shared';
import { apiFetch, postJson, setSignedOutHandler } from '../api/client';
import { clearTokens, getTokens, loadTokens, saveTokens } from './token-store';

export type Status = 'loading' | 'signedOut' | 'signedIn';

interface AuthValue {
  status: Status;
  account: PublicAccount | null;
  signIn: (email: string, password: string) => Promise<void>;
  register: (name: string, email: string, password: string) => Promise<void>;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthValue | null>(null);

export const useAuth = (): AuthValue => {
  const value = useContext(AuthContext);
  if (!value) throw new Error('useAuth must be used inside AuthProvider');
  return value;
};

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const queryClient = useQueryClient();
  const [status, setStatus] = useState<Status>('loading');
  const [account, setAccount] = useState<PublicAccount | null>(null);

  const finishSignIn = useCallback(async (auth: AuthResponse) => {
    await saveTokens({ accessToken: auth.accessToken, refreshToken: auth.refreshToken });
    setAccount(auth.account);
    setStatus('signedIn');
  }, []);

  // Everything a person created stays on the server; clear what this phone cached of it.
  const endSession = useCallback(() => {
    setAccount(null);
    setStatus('signedOut');
    queryClient.clear();
  }, [queryClient]);

  useEffect(() => {
    setSignedOutHandler(endSession);
    return () => setSignedOutHandler(null);
  }, [endSession]);

  // On launch: a stored session counts only if the server still accepts it.
  useEffect(() => {
    const restore = async () => {
      if (!(await loadTokens())) return setStatus('signedOut');
      try {
        setAccount(await apiFetch<PublicAccount>('/auth/me'));
        setStatus('signedIn');
      } catch {
        // Not "unreachable": a 401 here already cleared the tokens through the signed-out handler.
        if (getTokens()) setStatus('signedOut');
      }
    };
    void restore();
  }, []);

  const value = useMemo<AuthValue>(
    () => ({
      status,
      account,
      signIn: async (email, password) =>
        finishSignIn(
          await postJson<AuthResponse>('/auth/login', { email, password }, { auth: false })
        ),
      register: async (name, email, password) =>
        finishSignIn(
          await postJson<AuthResponse>('/auth/register', { name, email, password }, { auth: false })
        ),
      signOut: async () => {
        const tokens = getTokens();
        if (tokens) {
          // Best effort: the person is signed out on this phone even if the server can't be reached.
          await postJson(
            '/auth/logout',
            { refreshToken: tokens.refreshToken },
            { auth: false }
          ).catch(() => undefined);
        }
        await clearTokens();
        endSession();
      },
    }),
    [status, account, finishSignIn, endSession]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};
