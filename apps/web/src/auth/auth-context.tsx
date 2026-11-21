import { useCallback, useEffect, useMemo, useState } from 'react';
import type { ReactNode } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import type { AuthResponse, PublicAccount } from '@heartwood/shared';
import { AuthContext, type AuthValue, type Status } from './use-auth';
import { apiFetch, postJson, refreshSession, setSignedOutHandler, tokens } from '../api/client';

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const queryClient = useQueryClient();
  const [status, setStatus] = useState<Status>('loading');
  const [account, setAccount] = useState<PublicAccount | null>(null);

  const finishSignIn = useCallback((auth: AuthResponse) => {
    tokens.save({ accessToken: auth.accessToken, refreshToken: auth.refreshToken });
    setAccount(auth.account);
    setStatus('signedIn');
  }, []);

  // Everything a person created stays on the server; drop what this tab cached of it.
  const endSession = useCallback(() => {
    setAccount(null);
    setStatus('signedOut');
    queryClient.clear();
  }, [queryClient]);

  useEffect(() => {
    setSignedOutHandler(endSession);
    return () => setSignedOutHandler(null);
  }, [endSession]);

  // On load: a stored refresh token counts only if the server still accepts it.
  useEffect(() => {
    const restore = async () => {
      if (!tokens.hasRefresh() || !(await refreshSession())) {
        tokens.clear();
        return setStatus('signedOut');
      }
      try {
        setAccount(await apiFetch<PublicAccount>('/auth/me'));
        setStatus('signedIn');
      } catch {
        tokens.clear();
        setStatus('signedOut');
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
      updateAccount: setAccount,
      signOut: async () => {
        const refreshToken = localStorage.getItem('heartwood.refreshToken');
        if (refreshToken) {
          // Best effort: the person is signed out here even if the server can't be reached.
          await postJson('/auth/logout', { refreshToken }, { auth: false }).catch(() => undefined);
        }
        tokens.clear();
        endSession();
      },
    }),
    [status, account, finishSignIn, endSession]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};
