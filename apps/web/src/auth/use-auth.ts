import { createContext, useContext } from 'react';
import type { PublicAccount } from '@heartwood/shared';

export type Status = 'loading' | 'signedOut' | 'signedIn';

export interface AuthValue {
  status: Status;
  account: PublicAccount | null;
  signIn: (email: string, password: string) => Promise<void>;
  register: (name: string, email: string, password: string) => Promise<void>;
  signOut: () => Promise<void>;
  /** Replaces the signed-in person's details after they change them (their profile). */
  updateAccount: (account: PublicAccount) => void;
}

export const AuthContext = createContext<AuthValue | null>(null);

export const useAuth = (): AuthValue => {
  const value = useContext(AuthContext);
  if (!value) throw new Error('useAuth must be used inside AuthProvider');
  return value;
};
