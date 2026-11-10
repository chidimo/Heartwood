import { useState } from 'react';
import { Pressable, Text } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import type { BeneficiaryDto } from '@heartwood/shared';
import { errorMessage } from '../../src/api/client';
import { Button } from '../../src/components/button';
import { QueryState } from '../../src/components/query-state';
import { Screen } from '../../src/components/screen';
import { Select } from '../../src/components/select';
import { TextField } from '../../src/components/text-field';
import {
  useBeneficiaries,
  useCreateBeneficiary,
  useDeleteBeneficiary,
  useUpdateBeneficiary,
} from '../../src/features/inventory/api';
import { CONTINGENCY_OPTIONS, type ContingencyChoice } from '../../src/features/inventory/labels';
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

  const [name, setName] = useState(existing?.name ?? '');
  const [relationship, setRelationship] = useState(existing?.relationship ?? '');
  const [contact, setContact] = useState(existing?.contact ?? '');
  const [plan, setPlan] = useState<ContingencyChoice>(existing?.contingencyPlan ?? 'unset');
  const [fallbackId, setFallbackId] = useState<string>(existing?.contingencyBeneficiaryId ?? '');

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
    const payload = {
      name: name.trim(),
      relationship: relationship.trim(),
      contact: contact.trim() || null,
      contingencyPlan: plan === 'unset' ? null : plan,
      contingencyBeneficiaryId: needsFallback ? fallbackId : null,
    };
    if (existing) {
      update.mutate(payload, {
        onSuccess: () => handleDone('Saved'),
        onError: handleFailed("Couldn't save"),
      });
    } else {
      create.mutate(payload, {
        onSuccess: () => handleDone('Beneficiary added'),
        onError: handleFailed("Couldn't add"),
      });
    }
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
      <TextField label="Name" value={name} onChangeText={setName} autoComplete="name" />
      <TextField
        label="Relationship to you"
        value={relationship}
        onChangeText={setRelationship}
        hint="For example daughter, brother, friend."
      />
      <TextField
        label="Phone or email (optional)"
        value={contact}
        onChangeText={setContact}
        autoCapitalize="none"
      />
      <Select
        label="If they die before you"
        value={plan}
        options={CONTINGENCY_OPTIONS}
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
        disabled={!name.trim() || !relationship.trim() || (needsFallback && !fallbackId)}
        testID="save-beneficiary"
      />
      {existing && (
        <Pressable onPress={handleDelete} accessibilityRole="button">
          <Text className="text-center text-danger">Remove this beneficiary</Text>
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
