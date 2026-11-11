import { useState } from 'react';
import type { FormEvent } from 'react';
import { toast } from 'sonner';
import { getErrorMessage } from '../api/client';
import { useAuth } from '../auth/use-auth';
import { Button } from '../components/button';
import { Heading } from '../components/layout';
import { TextField } from '../components/text-field';
import { useUpdateProfile } from '../features/api';

/** The person's own details: their name and where they live, which the draft will opens with. */
export const ProfilePage = () => {
  const { account, updateAccount } = useAuth();
  const update = useUpdateProfile();
  const [name, setName] = useState(account?.name ?? '');
  const [address, setAddress] = useState(account?.address ?? '');

  const handleSubmit = (event: FormEvent) => {
    event.preventDefault();
    update.mutate(
      { name: name.trim(), address: address.trim() || null },
      {
        onSuccess: updated => {
          updateAccount(updated);
          toast.success('Profile saved');
        },
        onError: error => toast.error(getErrorMessage(error, "Couldn't save. Try again.")),
      }
    );
  };

  return (
    <>
      <Heading>Profile</Heading>
      <p className="text-ink/70 dark:text-white/70">
        Your details. Your name and address open your draft will.
      </p>
      <form onSubmit={handleSubmit} className="flex flex-col gap-4">
        <TextField label="Name" value={name} onChange={setName} autoComplete="name" />
        <TextField
          label="Email"
          value={account?.email ?? ''}
          onChange={() => {}}
          readOnly
          hint="You sign in with this. It can't be changed here."
        />
        <TextField
          label="Address"
          value={address}
          onChange={setAddress}
          multiline
          autoComplete="street-address"
          hint="Where you live, as it should appear in your will."
        />
        <div>
          <Button type="submit" loading={update.isPending} disabled={!name.trim()}>
            Save
          </Button>
        </div>
      </form>
    </>
  );
};
