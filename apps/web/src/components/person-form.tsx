import { useState } from 'react';
import type { FormEvent } from 'react';
import { toast } from 'sonner';
import {
  ageInYears,
  RELATIONSHIP_OPTIONS,
  type BeneficiaryDto,
  type ContingencyChoice,
  type Relationship,
} from '@heartwood/shared';
import { getErrorMessage } from '../api/client';
import { useCreateBeneficiary, useDeleteBeneficiary, useUpdateBeneficiary } from '../features/api';
import { confirmDestructive } from '../lib/confirm';
import { Button } from './button';
import { ContingencyFields } from './contingency-fields';
import { DateField } from './date-field';
import { SelectField } from './select-field';
import { TextField } from './text-field';

interface Props {
  /** The person being edited, or null to add one. */
  existing: BeneficiaryDto | null;
  others: BeneficiaryDto[];
  onDone: () => void;
}

export const PersonForm = ({ existing, others, onDone }: Props) => {
  const id = existing?.id ?? '';
  const create = useCreateBeneficiary();
  const update = useUpdateBeneficiary(id);
  const remove = useDeleteBeneficiary(id);

  const [name, setName] = useState(existing?.name ?? '');
  const [relationship, setRelationship] = useState<string>(existing?.relationship ?? '');
  const [relationshipOther, setRelationshipOther] = useState(existing?.relationshipOther ?? '');
  const [dateOfBirth, setDateOfBirth] = useState<string | null>(existing?.dateOfBirth ?? null);
  const [contact, setContact] = useState(existing?.contact ?? '');
  const [address, setAddress] = useState(existing?.address ?? '');
  const [plan, setPlan] = useState<ContingencyChoice>(existing?.contingencyPlan ?? 'unset');
  const [fallbackId, setFallbackId] = useState<string>(existing?.contingencyBeneficiaryId ?? '');

  const needsFallback = plan === 'named_beneficiary';

  const handleDone = (message: string) => {
    toast.success(message);
    onDone();
  };
  const handleFailed = (error: unknown) =>
    toast.error(getErrorMessage(error, 'Something went wrong. Try again.'));

  const handleSubmit = (event: FormEvent) => {
    event.preventDefault();
    const payload = {
      name: name.trim(),
      contact: contact.trim() || null,
      address: address.trim() || null,
      contingencyPlan: plan === 'unset' ? null : plan,
      contingencyBeneficiaryId: needsFallback ? fallbackId : null,
      relationship: relationship as Relationship,
      relationshipOther: relationship === 'other' ? relationshipOther.trim() : null,
      dateOfBirth,
    };
    if (existing) {
      update.mutate(payload, { onSuccess: () => handleDone('Saved'), onError: handleFailed });
      return;
    }
    create.mutate(
      { ...payload, kind: 'person' },
      { onSuccess: () => handleDone('Person added'), onError: handleFailed }
    );
  };

  const handleDelete = () => {
    const message = `Remove ${existing?.name}? They will no longer appear in your will. You can't remove someone who still has a share or is another person's fallback.`;
    if (!confirmDestructive(message)) return;
    remove.mutate(undefined, { onSuccess: () => handleDone('Removed'), onError: handleFailed });
  };

  const disabled = !name.trim() || !relationship.trim() || (needsFallback && !fallbackId);

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-4">
      <TextField label="Name" value={name} onChange={setName} autoComplete="name" />
      <SelectField
        label="Relationship to you"
        value={relationship}
        options={RELATIONSHIP_OPTIONS}
        onChange={setRelationship}
      />
      {relationship === 'other' && (
        <TextField
          label="How are they related to you?"
          value={relationshipOther}
          onChange={setRelationshipOther}
          hint="For example: godmother, mentor, business partner."
        />
      )}
      <DateField
        label="Date of birth (optional)"
        value={dateOfBirth}
        onChange={setDateOfBirth}
        hint={
          dateOfBirth
            ? `Age ${ageInYears(dateOfBirth)}. Only used to check age conditions on a gift.`
            : 'Only used to check age conditions on a gift.'
        }
      />
      <TextField label="Phone or email (optional)" value={contact} onChange={setContact} />
      <TextField
        label="Address (optional)"
        value={address}
        onChange={setAddress}
        multiline
        hint="Where your executor can find them."
      />
      <ContingencyFields
        kind="person"
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
            Remove this person
          </Button>
        )}
      </div>
    </form>
  );
};
