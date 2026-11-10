import { Link } from '@tanstack/react-router';
import { beneficiarySubtitle, contingencyLabel, contingencyQuestion } from '@heartwood/shared';
import { Heading } from '../components/layout';
import { QueryState } from '../components/query-state';
import { useBeneficiaries } from '../features/api';

export const PeoplePage = () => {
  const beneficiaries = useBeneficiaries();
  return (
    <>
      <div className="flex items-center justify-between">
        <Heading>People</Heading>
        <Link
          to="/people/new"
          className="flex h-11 items-center rounded-xl bg-primary-600 px-5 font-semibold text-white hover:bg-primary-700"
        >
          Add a beneficiary
        </Link>
      </div>
      <p className="text-ink/70 dark:text-white/70">
        The people and organisations you want to leave things to.
      </p>
      <QueryState
        query={beneficiaries}
        isEmpty={list => list.length === 0}
        empty={
          <p className="py-8 text-center text-ink/60 dark:text-white/60">
            No one yet. Add the first person or organisation.
          </p>
        }
      >
        {list => (
          <ul className="flex flex-col gap-3">
            {list.map(item => (
              <li key={item.id}>
                <Link
                  to="/people/$id"
                  params={{ id: item.id }}
                  className="block rounded-xl border border-primary-600/20 p-4 hover:bg-primary-50 dark:hover:bg-primary-900"
                >
                  <p className="font-medium">{item.name}</p>
                  <p className="text-ink/60 dark:text-white/60">{beneficiarySubtitle(item)}</p>
                  <p className="mt-1 text-xs text-ink/60 dark:text-white/60">
                    {contingencyQuestion(item.kind)}: {contingencyLabel(item)}
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
