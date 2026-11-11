import { useState } from 'react';
import { EXECUTOR_KIND_OPTIONS, type ExecutorDto } from '@heartwood/shared';
import { Button } from '../components/button';
import { ExecutorForm } from '../components/executor-form';
import { Heading } from '../components/layout';
import { Modal } from '../components/modal';
import { QueryState } from '../components/query-state';
import { useExecutors } from '../features/api';

export const ExecutorsPage = () => {
  const executors = useExecutors();
  // The one being edited, "new" for the add form, or null when no dialog is open.
  const [editing, setEditing] = useState<ExecutorDto | 'new' | null>(null);
  const handleClose = () => setEditing(null);

  return (
    <>
      <div className="flex items-center justify-between gap-3">
        <Heading>Executors and lawyers</Heading>
        <Button onClick={() => setEditing('new')}>Add someone</Button>
      </div>
      <p className="text-ink/70 dark:text-white/70">
        Who carries out your will, and who can hold a gift until a condition is met.
      </p>
      <QueryState query={executors}>
        {list => (
          <>
            {list.length === 0 && (
              <p className="py-8 text-center text-ink/60 dark:text-white/60">No one yet.</p>
            )}
            <ul className="flex flex-col gap-3">
              {list.map(x => (
                <li key={x.id}>
                  <button
                    type="button"
                    onClick={() => setEditing(x)}
                    className="block w-full rounded-xl border border-primary-600/20 p-4 text-left hover:bg-primary-50 dark:hover:bg-primary-900"
                  >
                    <p className="font-medium">{x.name}</p>
                    <p className="text-ink/60 dark:text-white/60">
                      {EXECUTOR_KIND_OPTIONS.find(o => o.value === x.kind)?.label ?? x.kind}
                    </p>
                  </button>
                </li>
              ))}
            </ul>
          </>
        )}
      </QueryState>
      {editing && (
        <Modal
          title={editing === 'new' ? 'Add an executor, lawyer or priest' : 'Edit'}
          onClose={handleClose}
        >
          <ExecutorForm
            key={editing === 'new' ? 'new' : editing.id}
            existing={editing === 'new' ? null : editing}
            onDone={handleClose}
          />
        </Modal>
      )}
    </>
  );
};
