import { useState } from 'react';
import Select from 'react-select';
import { INSTITUTION_TYPE_OPTIONS, type DirectoryEntry } from '@heartwood/shared';
import { useOrganizationDirectory } from '../features/api';
import { Field } from './field';
import { selectClassNames } from './select-styles';

const typeLabel = (entry: DirectoryEntry) =>
  INSTITUTION_TYPE_OPTIONS.find(o => o.value === entry.institutionType)?.label ??
  entry.institutionType;

const subtitle = (entry: DirectoryEntry) =>
  [typeLabel(entry), [entry.city, entry.state].filter(Boolean).join(', ')]
    .filter(Boolean)
    .join(' · ');

interface Props {
  value: DirectoryEntry | null;
  onPick: (entry: DirectoryEntry) => void;
}

/** A dropdown of our premade organisations, searched on the server as you type. */
export const DirectorySelect = ({ value, onPick }: Props) => {
  const [text, setText] = useState('');
  const results = useOrganizationDirectory({ q: text, limit: 10 });
  return (
    <Field
      label="Choose from our list"
      htmlFor="directory-select"
      hint="Type to search missions, mission hospitals, schools and more."
    >
      <Select<DirectoryEntry, false>
        inputId="directory-select"
        unstyled
        options={results.data?.items ?? []}
        value={value}
        inputValue={text}
        onInputChange={(next, meta) => {
          if (meta.action === 'input-change') setText(next);
        }}
        filterOption={null}
        isLoading={results.isFetching}
        getOptionValue={entry => entry.id}
        getOptionLabel={entry => entry.name}
        formatOptionLabel={entry => (
          <div>
            <p>{entry.name}</p>
            <p className="text-xs opacity-70">{subtitle(entry)}</p>
          </div>
        )}
        placeholder="Search by name…"
        noOptionsMessage={() => 'Not in our list. Enter it yourself instead.'}
        onChange={entry => entry && onPick(entry)}
        classNames={selectClassNames<DirectoryEntry>()}
      />
    </Field>
  );
};
