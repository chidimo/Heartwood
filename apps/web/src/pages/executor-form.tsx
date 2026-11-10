import { useState } from 'react';
import type { FormEvent } from 'react';
import { useNavigate, useParams } from '@tanstack/react-router';
import { toast } from 'sonner';
import { EXECUTOR_KIND_OPTIONS, type ExecutorDto } from '@heartwood/shared';
import { getErrorMessage } from '../api/client';
import { Button } from '../components/button';
import { Heading } from '../components/layout';
import { QueryState } from '../components/query-state';
import { Segmented } from '../components/segmented';
import { TextField } from '../components/text-field';
import {
  useCreateExecutor,
  useDeleteExecutor,
  useExecutors,
  useUpdateExecutor,
} from '../features/api';
import { confirmDestructive } from '../lib/confirm';

const ExecutorForm = ({ existing }: { existing: ExecutorDto | null }) => {
  const navigate = useNavigate();
  const id = existing?.id ?? '';
  const create = useCreateExecutor();
  const update = useUpdateExecutor(id);
  const remove = useDeleteExecutor(id);

  const [kind, setKind] = useState<ExecutorDto['kind']>(existing?.kind ?? 'lawyer');
  const [name, setName] = useState(existing?.name ?? '');
  const [contact, setContact] = useState(existing?.contact ?? '');

  const handleDone = (message: string) => {
    toast.success(message);
    void navigate({ to: '/executors' });
  };
  const handleFailed = (error: unknown) =>
    toast.error(getErrorMessage(error, 'Something went wrong. Try again.'));

  const handleSubmit = (event: FormEvent) => {
    event.preventDefault();
    const payload = { kind, name: name.trim(), contact: contact.trim() || null };
    if (existing) {
      update.mutate(payload, { onSuccess: () => handleDone('Saved'), onError: handleFailed });
      return;
    }
    create.mutate(payload, { onSuccess: () => handleDone('Added'), onError: handleFailed });
  };

  const handleDelete = () => {
    const message = `Remove ${existing?.name}? You can't remove someone who is holding a gift until a condition is met.`;
    if (!confirmDestructive(message)) return;
    remove.mutate(undefined, { onSuccess: () => handleDone('Removed'), onError: handleFailed });
  };

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-4">
      <Segmented label="Role" value={kind} options={EXECUTOR_KIND_OPTIONS} onChange={setKind} />
      <TextField label="Name" value={name} onChange={setName} autoComplete="name" />
      <TextField label="Phone or email (optional)" value={contact} onChange={setContact} />
      <div className="flex items-center gap-6">
        <Button
          type="submit"
          loading={create.isPending || update.isPending}
          disabled={!name.trim()}
        >
          Save
        </Button>
        {existing && (
          <Button variant="danger-link" onClick={handleDelete} loading={remove.isPending}>
            Remove this person
          </Button>
        )}
      </div>
    </form>
  );
};

export const ExecutorFormPage = () => {
  const { id } = useParams({ strict: false }) as { id?: string };
  const executors = useExecutors();
  return (
    <>
      <Heading>{id ? 'Edit' : 'Add an executor or lawyer'}</Heading>
      <QueryState query={executors}>
        {list => {
          const existing = id ? (list.find(x => x.id === id) ?? null) : null;
          return <ExecutorForm key={existing?.id ?? 'new'} existing={existing} />;
        }}
      </QueryState>
    </>
  );
};
