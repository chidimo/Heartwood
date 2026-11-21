import { useState } from 'react';
import { Pressable, Text } from 'react-native';
import { useRouter } from 'expo-router';
import {
  INSTITUTION_TYPE_OPTIONS,
  type BeneficiaryDto,
  type ContingencyChoice,
  type DirectoryEntry,
  type InstitutionType,
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
import { DirectorySelect } from './directory-select';
import { Screen } from './screen';
import { Segmented } from './segmented';
import { Select } from './select';
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
}

export const OrganizationForm = ({ existing, others }: Props) => {
  const router = useRouter();
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

  const fromList = mode === 'list';
  const needsFallback = plan === 'named_beneficiary';
  const saving = create.isPending || update.isPending;

  const handlePick = (entry: DirectoryEntry) => {
    setPicked(entry);
    setName(entry.name);
    setInstitutionType(entry.institutionType);
    if (!address.trim()) setAddress([entry.city, entry.state].filter(Boolean).join(', '));
  };

  const handleDone = (message: string) => {
    notify.success(message);
    router.back();
  };
  const handleFailed = (title: string) => (error: unknown) =>
    notify.error(title, errorMessage(error, 'Try again.'));

  const handleSave = () => {
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
      update.mutate(payload, {
        onSuccess: () => handleDone('Saved'),
        onError: handleFailed("Couldn't save"),
      });
      return;
    }
    create.mutate(
      { ...payload, kind: 'institution' },
      { onSuccess: () => handleDone('Organisation added'), onError: handleFailed("Couldn't add") }
    );
  };

  const handleDelete = () =>
    confirmDestructive(
      'Remove this organisation?',
      `${existing?.name} will no longer appear in your will. You can't remove an organisation that still has a share or is someone's fallback.`,
      'Remove',
      () =>
        remove.mutate(undefined, {
          onSuccess: () => handleDone('Removed'),
          onError: handleFailed("Couldn't remove"),
        })
    );

  const hasOrganisation = fromList ? Boolean(picked) : Boolean(name.trim());

  return (
    <Screen
      footer={
        <Button
          label="Save"
          onPress={handleSave}
          loading={saving}
          disabled={!hasOrganisation || (needsFallback && !fallbackId)}
          testID="save-beneficiary"
        />
      }
    >
      <Segmented value={mode} options={MODE_OPTIONS} onChange={setMode} />
      {fromList && <DirectorySelect value={picked} onPick={handlePick} testID="directory-select" />}
      {!fromList && (
        <>
          <TextField
            label="Organisation's full name"
            value={name}
            onChangeText={setName}
            hint="Use its full name, and say which branch or parish if it has more than one."
          />
          <Select
            label="What kind of organisation is it?"
            value={institutionType}
            options={INSTITUTION_TYPE_OPTIONS}
            onChange={setInstitutionType}
            testID="institution-type"
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
      <ContingencyFields
        kind="institution"
        plan={plan}
        onPlanChange={setPlan}
        fallbackId={fallbackId}
        onFallbackChange={setFallbackId}
        others={others}
      />
      {existing && (
        <Pressable onPress={handleDelete} accessibilityRole="button">
          <Text className="text-center text-danger">Remove this organisation</Text>
        </Pressable>
      )}
    </Screen>
  );
};
