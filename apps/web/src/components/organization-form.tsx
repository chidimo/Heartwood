import { useState } from 'react';
import type { FormEvent } from 'react';
import { toast } from 'sonner';
import {
  INSTITUTION_TYPE_OPTIONS,
  type BeneficiaryDto,
  type ContingencyChoice,
  type DirectoryEntry,
  type InstitutionType,
} from '@heartwood/shared';
import { getErrorMessage } from '../api/client';
import { useCreateBeneficiary, useDeleteBeneficiary, useUpdateBeneficiary } from '../features/api';
import { confirmDestructive } from '../lib/confirm';
import { Button } from './button';
import { ContingencyFields } from './contingency-fields';
import { DirectorySelect } from './directory-select';
import { Segmented } from './segmented';
import { SelectField } from './select-field';
import { TextField } from './text-field';

type Mode = 'list' | 'manual';
const MODE_OPTIONS = [
  { value: 'list', label: 'From our list' },
  { value: 'manual', label: 'Enter it myself' },
] as const;

interface Props {
  /** The organisation being edited, or null to add one. */
  existing: BeneficiaryDto | null;
  others: BeneficiaryDto[];
  onDone: () => void;
}

export const OrganizationForm = ({ existing, others, onDone }: Props) => {
  const id = existing?.id ?? '';
  const create = useCreateBeneficiary();
  const update = useUpdateBeneficiary(id);
  const remove = useDeleteBeneficiary(id);

  // Picked from our list (kept as a reference) or typed in by hand.
  const [mode, setMode] = useState<Mode>(existing && !existing.directoryId ? 'manual' : 'list');
  const [picked, setPicked] = useState<DirectoryEntry | null>(
    existing?.directoryId
      ? {
          id: existing.directoryId,
          name: existing.name,
          institutionType: existing.institutionType ?? 'church',
          state: null,
          city: null,
        }
      : null
  );
  const [name, setName] = useState(existing?.name ?? '');
  const [institutionType, setInstitutionType] = useState<InstitutionType>(
    existing?.institutionType ?? 'church'
  );
  const [contact, setContact] = useState(existing?.contact ?? '');
  const [address, setAddress] = useState(existing?.address ?? '');
  const [plan, setPlan] = useState<ContingencyChoice>(existing?.contingencyPlan ?? 'unset');
  const [fallbackId, setFallbackId] = useState<string>(existing?.contingencyBeneficiaryId ?? '');

  const needsFallback = plan === 'named_beneficiary';

  const fromList = mode === 'list';

  const handlePick = (entry: DirectoryEntry) => {
    setPicked(entry);
    setName(entry.name);
    setInstitutionType(entry.institutionType);
    if (!address.trim()) setAddress([entry.city, entry.state].filter(Boolean).join(', '));
  };

  const handleDone = (message: string) => {
    toast.success(message);
    onDone();
  };
  const handleFailed = (error: unknown) =>
    toast.error(getErrorMessage(error, 'Something went wrong. Try again.'));

  const handleSubmit = (event: FormEvent) => {
    event.preventDefault();
    const payload = {
      name: fromList ? (picked?.name ?? '') : name.trim(),
      institutionType: fromList ? (picked?.institutionType ?? institutionType) : institutionType,
      directoryId: fromList ? (picked?.id ?? null) : null,
      contact: contact.trim() || null,
      address: address.trim() || null,
      contingencyPlan: plan === 'unset' ? null : plan,
      contingencyBeneficiaryId: needsFallback ? fallbackId : null,
    };
    if (existing) {
      update.mutate(payload, { onSuccess: () => handleDone('Saved'), onError: handleFailed });
      return;
    }
    create.mutate(
      { ...payload, kind: 'institution' },
      { onSuccess: () => handleDone('Organisation added'), onError: handleFailed }
    );
  };

  const handleDelete = () => {
    const message = `Remove ${existing?.name}? It will no longer appear in your will. You can't remove an organisation that still has a share or is someone's fallback.`;
    if (!confirmDestructive(message)) return;
    remove.mutate(undefined, { onSuccess: () => handleDone('Removed'), onError: handleFailed });
  };

  const hasOrganisation = fromList ? Boolean(picked) : Boolean(name.trim());
  const disabled = !hasOrganisation || (needsFallback && !fallbackId);

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-4">
      <Segmented
        label="How do you want to add it?"
        value={mode}
        options={MODE_OPTIONS}
        onChange={setMode}
      />
      {fromList && <DirectorySelect value={picked} onPick={handlePick} />}
      {!fromList && (
        <>
          <TextField
            label="Organisation's full name"
            value={name}
            onChange={setName}
            hint="Use its full name, and say which branch or parish if it has more than one."
          />
          <SelectField
            label="What kind of organisation is it?"
            value={institutionType}
            options={INSTITUTION_TYPE_OPTIONS}
            onChange={setInstitutionType}
          />
        </>
      )}
      <TextField label="Phone or email (optional)" value={contact} onChange={setContact} />
      <TextField
        label="Address (optional)"
        value={address}
        onChange={setAddress}
        multiline
        hint="Where your executor can find them."
      />
      <ContingencyFields
        kind="institution"
        plan={plan}
        onPlanChange={setPlan}
        fallbackId={fallbackId}
        onFallbackChange={setFallbackId}
        others={others}
      />
      <div className="flex items-center gap-6">
        <Button type="submit" loading={create.isPending || update.isPending} disabled={disabled}>
          Save
        </Button>
        {existing && (
          <Button variant="danger-link" onClick={handleDelete} loading={remove.isPending}>
            Remove this organisation
          </Button>
        )}
      </div>
    </form>
  );
};
