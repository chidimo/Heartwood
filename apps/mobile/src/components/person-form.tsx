import { useState } from 'react';
import { Pressable, Text } from 'react-native';
import { useRouter } from 'expo-router';
import {
  ageInYears,
  RELATIONSHIP_OPTIONS,
  type BeneficiaryDto,
  type ContingencyChoice,
  type Relationship,
} from '@heartwood/shared';
import { errorMessage } from '../api/client';
import {
  useCreateBeneficiary,
  useDeleteBeneficiary,
  useUpdateBeneficiary,
} from '../features/inventory/api';
import { notify } from '../notifications/notify';
import { confirmDestructive } from '../utils/confirm';
import { Button } from './button';
import { ContingencyFields } from './contingency-fields';
import { DateField } from './date-field';
import { Screen } from './screen';
import { Select } from './select';
import { TextField } from './text-field';

interface Props {
  /** The person being edited, or null to add one. */
  existing: BeneficiaryDto | null;
  others: BeneficiaryDto[];
}

export const PersonForm = ({ existing, others }: Props) => {
  const router = useRouter();
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
  const saving = create.isPending || update.isPending;

  const handleDone = (message: string) => {
    notify.success(message);
    router.back();
  };
  const handleFailed = (title: string) => (error: unknown) =>
    notify.error(title, errorMessage(error, 'Try again.'));

  const handleSave = () => {
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
      update.mutate(payload, {
        onSuccess: () => handleDone('Saved'),
        onError: handleFailed("Couldn't save"),
      });
      return;
    }
    create.mutate(
      { ...payload, kind: 'person' },
      { onSuccess: () => handleDone('Person added'), onError: handleFailed("Couldn't add") }
    );
  };

  const handleDelete = () =>
    confirmDestructive(
      'Remove this person?',
      `${existing?.name} will no longer appear in your will. You can't remove someone who still has a share or is another person's fallback.`,
      'Remove',
      () =>
        remove.mutate(undefined, {
          onSuccess: () => handleDone('Removed'),
          onError: handleFailed("Couldn't remove"),
        })
    );

  return (
    <Screen
      footer={
        <Button
          label="Save"
          onPress={handleSave}
          loading={saving}
          disabled={!name.trim() || !relationship.trim() || (needsFallback && !fallbackId)}
          testID="save-beneficiary"
        />
      }
    >
      <TextField label="Name" value={name} onChangeText={setName} autoComplete="name" />
      <Select
        label="Relationship to you"
        value={relationship}
        options={RELATIONSHIP_OPTIONS}
        onChange={setRelationship}
        testID="relationship"
      />
      {relationship === 'other' && (
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
      <ContingencyFields
        kind="person"
        plan={plan}
        onPlanChange={setPlan}
        fallbackId={fallbackId}
        onFallbackChange={setFallbackId}
        others={others}
      />
      {existing && (
        <Pressable onPress={handleDelete} accessibilityRole="button">
          <Text className="text-center text-danger">Remove this person</Text>
        </Pressable>
      )}
    </Screen>
  );
};
