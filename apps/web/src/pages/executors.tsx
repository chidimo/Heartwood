import { Link } from '@tanstack/react-router';
import { EXECUTOR_KIND_OPTIONS } from '@heartwood/shared';
import { Heading } from '../components/layout';
import { QueryState } from '../components/query-state';
import { useExecutors } from '../features/api';

export const ExecutorsPage = () => {
  const executors = useExecutors();
  return (
    <>
      <div className="flex items-center justify-between">
        <Heading>Executor and lawyer</Heading>
        <Link
          to="/executors/new"
          className="flex h-11 items-center rounded-xl bg-primary-600 px-5 font-semibold text-white hover:bg-primary-700"
        >
          Add someone
        </Link>
      </div>
      <p className="text-ink/70 dark:text-white/70">
        Who carries out your will, and who can hold a gift until a condition is met.
      </p>
      <QueryState
        query={executors}
        isEmpty={list => list.length === 0}
        empty={<p className="py-8 text-center text-ink/60 dark:text-white/60">No one yet.</p>}
      >
        {list => (
          <ul className="flex flex-col gap-3">
            {list.map(x => (
              <li key={x.id}>
                <Link
                  to="/executors/$id"
                  params={{ id: x.id }}
                  className="block rounded-xl border border-primary-600/20 p-4 hover:bg-primary-50 dark:hover:bg-primary-900"
                >
                  <p className="font-medium">{x.name}</p>
                  <p className="text-ink/60 dark:text-white/60">
                    {EXECUTOR_KIND_OPTIONS.find(o => o.value === x.kind)?.label ?? x.kind}
                  </p>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </QueryState>
    </>
  );
};
