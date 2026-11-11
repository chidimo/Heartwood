import { useState } from 'react';
import type { FormEvent } from 'react';
import { Link, useNavigate } from '@tanstack/react-router';
import { toast } from 'sonner';
import { getErrorMessage } from '../api/client';
import { useAuth } from '../auth/use-auth';
import { Button } from '../components/button';
import { AuthShell } from '../components/layout';
import { TextField } from '../components/text-field';

export const LoginPage = () => {
  const { signIn } = useAuth();
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isPending, setIsPending] = useState(false);

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault();
    setIsPending(true);
    try {
      await signIn(email.trim(), password);
      await navigate({ to: '/assets' });
    } catch (error) {
      toast.error(getErrorMessage(error, "Couldn't sign in. Try again."));
    } finally {
      setIsPending(false);
    }
  };

  return (
    <AuthShell title="Sign in to your inventory.">
      <form onSubmit={e => void handleSubmit(e)} className="flex flex-col gap-4">
        <TextField
          label="Email"
          type="email"
          autoComplete="email"
          value={email}
          onChange={setEmail}
        />
        <TextField
          label="Password"
          type="password"
          autoComplete="current-password"
          value={password}
          onChange={setPassword}
        />
        <Button type="submit" loading={isPending} disabled={!email.trim() || !password}>
          Sign in
        </Button>
      </form>
      <Link to="/register" className="text-primary-600 hover:underline dark:text-primary-200">
        New here? Create an account
      </Link>
    </AuthShell>
  );
};
