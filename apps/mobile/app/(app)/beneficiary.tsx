import { useState } from 'react';
import { Pressable, Text } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import {
  ageInYears,
  type BeneficiaryDto,
  type BeneficiaryKind,
  type ContingencyChoice,
  contingencyOptionsFor,
  contingencyQuestion,
  INSTITUTION_TYPE_OPTIONS,
  type InstitutionType,
  KIND_OPTIONS,
  type Relationship,
  RELATIONSHIP_OPTIONS,
} from '@heartwood/shared';
import { errorMessage } from '../../src/api/client';
import { Button } from '../../src/components/button';
import { DateField } from '../../src/components/date-field';
import { QueryState } from '../../src/components/query-state';
import { Screen } from '../../src/components/screen';
import { Segmented } from '../../src/components/segmented';
import { Select } from '../../src/components/select';
import { TextField } from '../../src/components/text-field';
import {
  useBeneficiaries,
  useCreateBeneficiary,
  useDeleteBeneficiary,
  useUpdateBeneficiary,
} from '../../src/features/inventory/api';
import { notify } from '../../src/notifications/notify';
import { confirmDestructive } from '../../src/utils/confirm';

interface FormProps {
  /** The beneficiary being edited, or null to add a new one. */
  existing: BeneficiaryDto | null;
  others: BeneficiaryDto[];
}

const BeneficiaryForm = ({ existing, others }: FormProps) => {
  const router = useRouter();
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

  // "Pass it to their children" doesn't apply to an organisation.
  const handleKindChange = (next: BeneficiaryKind) => {
    setKind(next);
    if (next === 'institution' && plan === 'pass_to_descendants') setPlan('unset');
  };

  const fallbackOptions = others.map(b => ({ value: b.id, label: b.name }));
  const needsFallback = plan === 'named_beneficiary';
  const saving = create.isPending || update.isPending;

  const handleDone = (message: string) => {
    notify.success(message);
    router.back();
  };
  const handleFailed = (title: string) => (error: unknown) =>
    notify.error(title, errorMessage(error, 'Try again.'));

  const handleSave = () => {
    const common = {
      name: name.trim(),
      contact: contact.trim() || null,
      address: address.trim() || null,
      contingencyPlan: plan === 'unset' ? null : plan,
      contingencyBeneficiaryId: needsFallback ? fallbackId : null,
    };
    // What only a person has, or only an organisation has. The kind of an existing one can't change.
    const person = {
      relationship: relationship as Relationship,
      relationshipOther: relationship === 'other' ? relationshipOther.trim() : null,
      dateOfBirth,
    };
    if (existing) {
      update.mutate(
        { ...common, ...(isOrganisation ? { institutionType } : person) },
        { onSuccess: () => handleDone('Saved'), onError: handleFailed("Couldn't save") }
      );
      return;
    }
    create.mutate(
      isOrganisation ? { ...common, kind, institutionType } : { ...common, kind, ...person },
      { onSuccess: () => handleDone('Beneficiary added'), onError: handleFailed("Couldn't add") }
    );
  };

  const handleDelete = () =>
    confirmDestructive(
      'Remove this beneficiary?',
      `${existing?.name} will no longer appear in your will. You can't remove someone who still has a share or is another person's fallback.`,
      'Remove',
      () =>
        remove.mutate(undefined, {
          onSuccess: () => handleDone('Removed'),
          onError: handleFailed("Couldn't remove"),
        })
    );

  return (
    <Screen>
      {!existing && <Segmented value={kind} options={KIND_OPTIONS} onChange={handleKindChange} />}
      <TextField
        label={isOrganisation ? "Organisation's full name" : 'Name'}
        value={name}
        onChangeText={setName}
        autoComplete="name"
        hint={
          isOrganisation
            ? 'Use its full name, and say which branch or parish if it has more than one.'
            : undefined
        }
      />
      {isOrganisation ? (
        <Select
          label="What kind of organisation is it?"
          value={institutionType}
          options={INSTITUTION_TYPE_OPTIONS}
          onChange={setInstitutionType}
          testID="institution-type"
        />
      ) : (
        <>
          <Select
            label="Relationship to you"
            value={relationship}
            options={RELATIONSHIP_OPTIONS}
            onChange={setRelationship}
            testID="relationship"
          />
          {needsOther && (
            <TextField
              label="How are they related to you?"
              value={relationshipOther}
              onChangeText={setRelationshipOther}
              hint="For example: godmother, mentor, business partner."
            />
          )}
          <DateField
            label="Date of birth (optional)"
            value={dateOfBirth}
            onChange={setDateOfBirth}
            initialDate="2000-01-01"
            hint={
              dateOfBirth
                ? `Age ${ageInYears(dateOfBirth)}. Only used to check age conditions on a gift.`
                : 'Only used to check age conditions on a gift.'
            }
            testID="date-of-birth"
          />
        </>
      )}
      <TextField
        label="Phone or email (optional)"
        value={contact}
        onChangeText={setContact}
        autoCapitalize="none"
      />
      <TextField
        label="Address (optional)"
        value={address}
        onChangeText={setAddress}
        multiline
        hint="Where your executor can find them."
      />
      <Select
        label={contingencyQuestion(kind)}
        value={plan}
        options={contingencyOptionsFor(kind)}
        onChange={setPlan}
        testID="contingency"
      />
      {needsFallback && (
        <Select
          label="Who should receive their share?"
          value={fallbackId}
          options={fallbackOptions}
          onChange={setFallbackId}
        />
      )}
      <Button
        label="Save"
        onPress={handleSave}
        loading={saving}
        disabled={
          !name.trim() ||
          (!isOrganisation && !relationship.trim()) ||
          (needsFallback && !fallbackId)
        }
        testID="save-beneficiary"
      />
      {existing && (
        <Pressable onPress={handleDelete} accessibilityRole="button">
          <Text className="text-center text-danger">
            {isOrganisation ? 'Remove this organisation' : 'Remove this beneficiary'}
          </Text>
        </Pressable>
      )}
    </Screen>
  );
};

const BeneficiaryScreen = () => {
  const { id } = useLocalSearchParams<{ id?: string }>();
  const beneficiaries = useBeneficiaries();

  return (
    <QueryState query={beneficiaries}>
      {list => {
        const existing = id ? (list.find(b => b.id === id) ?? null) : null;
        // key resets the form's state when a different person is opened.
        return (
          <BeneficiaryForm
            key={existing?.id ?? 'new'}
            existing={existing}
            others={list.filter(b => b.id !== id)}
          />
        );
      }}
    </QueryState>
  );
};
export default BeneficiaryScreen;
