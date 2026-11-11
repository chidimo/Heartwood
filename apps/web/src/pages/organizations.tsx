import { useState } from 'react';
import { INSTITUTION_TYPE_OPTIONS, type DirectoryEntry } from '@heartwood/shared';
import { Heading } from '../components/layout';
import { Pagination } from '../components/pagination';
import { QueryState } from '../components/query-state';
import { SelectField } from '../components/select-field';
import { TextField } from '../components/text-field';
import { useOrganizationDirectory, useOrganizationStates } from '../features/api';
import { useDebouncedValue } from '../lib/use-debounced-value';

const PAGE_SIZE = 10;
const ALL = 'all';

const KIND_FILTER = [
  { value: ALL, label: 'All kinds' },
  ...INSTITUTION_TYPE_OPTIONS.map(o => ({ value: o.value as string, label: o.label })),
];

const typeLabel = (entry: DirectoryEntry) =>
  INSTITUTION_TYPE_OPTIONS.find(o => o.value === entry.institutionType)?.label ??
  entry.institutionType;

/** Browse the premade list of organisations. It is read-only: people pick from it when adding a beneficiary. */
export const OrganizationsPage = () => {
  const [search, setSearch] = useState('');
  const [kind, setKind] = useState(ALL);
  const [state, setState] = useState(ALL);
  const [page, setPage] = useState(1);
  const debouncedSearch = useDebouncedValue(search);
  const states = useOrganizationStates();

  const results = useOrganizationDirectory({
    q: debouncedSearch,
    type: kind === ALL ? undefined : (kind as DirectoryEntry['institutionType']),
    state: state === ALL ? undefined : state,
    page,
    limit: PAGE_SIZE,
  });

  // Any change to the filters starts again from the first page.
  const handleSearch = (value: string) => {
    setSearch(value);
    setPage(1);
  };
  const handleKind = (value: string) => {
    setKind(value);
    setPage(1);
  };
  const handleState = (value: string) => {
    setState(value);
    setPage(1);
  };

  const stateOptions = [
    { value: ALL, label: 'All states' },
    ...(states.data ?? []).map(s => ({ value: s, label: s })),
  ];

  return (
    <>
      <Heading>Organisations</Heading>
      <p className="text-ink/70 dark:text-white/70">
        Churches, mosques, missions, hospitals, schools and charities we already know about. Pick
        one from here when you add a beneficiary.
      </p>
      <div className="grid gap-4 sm:grid-cols-3">
        <TextField label="Search" value={search} onChange={handleSearch} />
        <SelectField label="Kind" value={kind} options={KIND_FILTER} onChange={handleKind} />
        <SelectField label="State" value={state} options={stateOptions} onChange={handleState} />
      </div>
      <QueryState
        query={results}
        isEmpty={data => data.total === 0}
        empty={
          <p className="py-8 text-center text-ink/60 dark:text-white/60">
            Nothing matches. You can still enter an organisation yourself when you add a
            beneficiary.
          </p>
        }
      >
        {data => (
          <>
            <p className="text-sm text-ink/60 dark:text-white/60">
              {data.total} {data.total === 1 ? 'organisation' : 'organisations'}
            </p>
            <ul className="flex flex-col gap-3">
              {data.items.map(entry => (
                <li key={entry.id} className="rounded-xl border border-primary-600/20 p-4">
                  <p className="font-medium">{entry.name}</p>
                  <p className="text-ink/60 dark:text-white/60">
                    {[typeLabel(entry), [entry.city, entry.state].filter(Boolean).join(', ')]
                      .filter(Boolean)
                      .join(' · ')}
                  </p>
                </li>
              ))}
            </ul>
            <Pagination page={data.page} totalPages={data.totalPages} onPageChange={setPage} />
          </>
        )}
      </QueryState>
    </>
  );
};
