import { useState } from 'react';
import type { FormEvent } from 'react';
import { useNavigate, useParams } from '@tanstack/react-router';
import { toast } from 'sonner';
import {
  ageInYears,
  contingencyOptionsFor,
  contingencyQuestion,
  INSTITUTION_TYPE_OPTIONS,
  KIND_OPTIONS,
  RELATIONSHIP_OPTIONS,
  type BeneficiaryDto,
  type BeneficiaryKind,
  type ContingencyChoice,
  type InstitutionType,
  type Relationship,
} from '@heartwood/shared';
import { getErrorMessage } from '../api/client';
import { Button } from '../components/button';
import { DateField } from '../components/date-field';
import { Heading } from '../components/layout';
import { QueryState } from '../components/query-state';
import { Segmented } from '../components/segmented';
import { SelectField } from '../components/select-field';
import { TextField } from '../components/text-field';
import {
  useBeneficiaries,
  useCreateBeneficiary,
  useDeleteBeneficiary,
  useUpdateBeneficiary,
} from '../features/api';
import { confirmDestructive } from '../lib/confirm';

interface FormProps {
  /** The beneficiary being edited, or null to add a new one. */
  existing: BeneficiaryDto | null;
  others: BeneficiaryDto[];
}

const PersonForm = ({ existing, others }: FormProps) => {
  const navigate = useNavigate();
  const id = existing?.id ?? '';
  const create = useCreateBeneficiary();
  const update = useUpdateBeneficiary(id);
  const remove = useDeleteBeneficiary(id);

  const [kind, setKind] = useState<BeneficiaryKind>(existing?.kind ?? 'person');
  const [name, setName] = useState(existing?.name ?? '');
  const [relationship, setRelationship] = useState<string>(existing?.relationship ?? '');
  const [relationshipOther, setRelationshipOther] = useState(existing?.relationshipOther ?? '');
  const [dateOfBirth, setDateOfBirth] = useState<string | null>(existing?.dateOfBirth ?? null);
  const [institutionType, setInstitutionType] = useState<InstitutionType>(
    existing?.institutionType ?? 'church'
  );
  const [contact, setContact] = useState(existing?.contact ?? '');
  const [address, setAddress] = useState(existing?.address ?? '');
  const [plan, setPlan] = useState<ContingencyChoice>(existing?.contingencyPlan ?? 'unset');
  const [fallbackId, setFallbackId] = useState<string>(existing?.contingencyBeneficiaryId ?? '');

  const isOrganisation = kind === 'institution';
  const needsOther = !isOrganisation && relationship === 'other';
  const needsFallback = plan === 'named_beneficiary';

  // "Pass it to their children" doesn't apply to an organisation.
  const handleKindChange = (next: BeneficiaryKind) => {
    setKind(next);
    if (next === 'institution' && plan === 'pass_to_descendants') setPlan('unset');
  };

  const handleDone = (message: string) => {
    toast.success(message);
    void navigate({ to: '/people' });
  };
  const handleFailed = (error: unknown) =>
    toast.error(getErrorMessage(error, 'Something went wrong. Try again.'));

  const handleSubmit = (event: FormEvent) => {
    event.preventDefault();
    const common = {
      name: name.trim(),
      contact: contact.trim() || null,
      address: address.trim() || null,
      contingencyPlan: plan === 'unset' ? null : plan,
      contingencyBeneficiaryId: needsFallback ? fallbackId : null,
    };
    const person = {
      relationship: relationship as Relationship,
      relationshipOther: relationship === 'other' ? relationshipOther.trim() : null,
      dateOfBirth,
    };
    if (existing) {
      update.mutate(
        { ...common, ...(isOrganisation ? { institutionType } : person) },
        { onSuccess: () => handleDone('Saved'), onError: handleFailed }
      );
      return;
    }
    create.mutate(
      isOrganisation ? { ...common, kind, institutionType } : { ...common, kind, ...person },
      { onSuccess: () => handleDone('Beneficiary added'), onError: handleFailed }
    );
  };

  const handleDelete = () => {
    const message = `Remove ${existing?.name}? They will no longer appear in your will. You can't remove someone who still has a share or is another person's fallback.`;
    if (!confirmDestructive(message)) return;
    remove.mutate(undefined, {
      onSuccess: () => handleDone('Removed'),
      onError: handleFailed,
    });
  };

  const disabled =
    !name.trim() || (!isOrganisation && !relationship.trim()) || (needsFallback && !fallbackId);

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-4">
      {!existing && (
        <Segmented
          label="Who is it?"
          value={kind}
          options={KIND_OPTIONS}
          onChange={handleKindChange}
        />
      )}
      <TextField
        label={isOrganisation ? "Organisation's full name" : 'Name'}
        value={name}
        onChange={setName}
        autoComplete="name"
        hint={
          isOrganisation
            ? 'Use its full name, and say which branch or parish if it has more than one.'
            : undefined
        }
      />
      {isOrganisation && (
        <SelectField
          label="What kind of organisation is it?"
          value={institutionType}
          options={INSTITUTION_TYPE_OPTIONS}
          onChange={setInstitutionType}
        />
      )}
      {!isOrganisation && (
        <>
          <SelectField
            label="Relationship to you"
            value={relationship}
            options={RELATIONSHIP_OPTIONS}
            onChange={setRelationship}
          />
          {needsOther && (
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
      <SelectField
        label={contingencyQuestion(kind)}
        value={plan}
        options={contingencyOptionsFor(kind)}
        onChange={setPlan}
      />
      {needsFallback && (
        <SelectField
          label="Who should receive their share?"
          value={fallbackId}
          options={others.map(b => ({ value: b.id, label: b.name }))}
          onChange={setFallbackId}
        />
      )}
      <div className="flex items-center gap-6">
        <Button type="submit" loading={create.isPending || update.isPending} disabled={disabled}>
          Save
        </Button>
        {existing && (
          <Button variant="danger-link" onClick={handleDelete} loading={remove.isPending}>
            {isOrganisation ? 'Remove this organisation' : 'Remove this beneficiary'}
          </Button>
        )}
      </div>
    </form>
  );
};

export const PersonFormPage = () => {
  const { id } = useParams({ strict: false }) as { id?: string };
  const beneficiaries = useBeneficiaries();
  return (
    <>
      <Heading>{id ? 'Edit beneficiary' : 'Add a beneficiary'}</Heading>
      <QueryState query={beneficiaries}>
        {list => {
          const existing = id ? (list.find(b => b.id === id) ?? null) : null;
          return (
            <PersonForm
              key={existing?.id ?? 'new'}
              existing={existing}
              others={list.filter(b => b.id !== id)}
            />
          );
        }}
      </QueryState>
    </>
  );
};
