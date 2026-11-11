import { useState } from 'react';
import type { FormEvent } from 'react';
import { Link, useNavigate } from '@tanstack/react-router';
import { toast } from 'sonner';
import { getErrorMessage } from '../api/client';
import { useAuth } from '../auth/use-auth';
import { Button } from '../components/button';
import { AuthShell } from '../components/layout';
import { TextField } from '../components/text-field';

const MIN_PASSWORD = 8;

export const RegisterPage = () => {
  const { register } = useAuth();
  const navigate = useNavigate();
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isPending, setIsPending] = useState(false);

  const passwordError =
    password.length > 0 && password.length < MIN_PASSWORD
      ? `Use at least ${MIN_PASSWORD} characters.`
      : null;

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault();
    setIsPending(true);
    try {
      await register(name.trim(), email.trim(), password);
      toast.success('Welcome to Heartwood');
      await navigate({ to: '/assets' });
    } catch (error) {
      toast.error(getErrorMessage(error, "Couldn't create your account. Try again."));
    } finally {
      setIsPending(false);
    }
  };

  return (
    <AuthShell title="Create your account.">
      <form onSubmit={e => void handleSubmit(e)} className="flex flex-col gap-4">
        <TextField label="Name" autoComplete="name" value={name} onChange={setName} />
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
          autoComplete="new-password"
          value={password}
          onChange={setPassword}
          error={passwordError}
        />
        <Button
          type="submit"
          loading={isPending}
          disabled={!name.trim() || !email.trim() || password.length < MIN_PASSWORD}
        >
          Create account
        </Button>
      </form>
      <Link to="/login" className="text-primary-600 hover:underline dark:text-primary-200">
        Already have an account? Sign in
      </Link>
    </AuthShell>
  );
};
