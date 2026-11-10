import { useState } from 'react';
import { useRouter } from 'expo-router';
import { ASSET_TYPES, type AssetType } from '@heartwood/shared';
import { errorMessage } from '../../src/api/client';
import { Button } from '../../src/components/button';
import { Screen } from '../../src/components/screen';
import { Select } from '../../src/components/select';
import { TextField } from '../../src/components/text-field';
import { useCreateAsset } from '../../src/features/assets/api';
import { ASSET_TYPE_LABELS } from '../../src/features/assets/labels';
import { notify } from '../../src/notifications/notify';

const TYPE_OPTIONS = ASSET_TYPES.map(value => ({ value, label: ASSET_TYPE_LABELS[value] }));

const NO_ACCOUNT_NUMBERS = "Don't enter account numbers or PINs. A name is enough.";

const AddAssetScreen = () => {
  const router = useRouter();
  const createAsset = useCreateAsset();
  const [type, setType] = useState<AssetType>('cash');
  const [description, setDescription] = useState('');
  const [institution, setInstitution] = useState('');
  const [value, setValue] = useState('');
  const [notes, setNotes] = useState('');

  const handleSave = () => {
    const roughValue = value.trim() ? Number(value.replace(/,/g, '')) : undefined;
    createAsset.mutate(
      {
        type,
        description: description.trim(),
        institution: institution.trim() || null,
        roughValue: roughValue !== undefined && Number.isFinite(roughValue) ? roughValue : null,
        notes: notes.trim() || null,
      },
      {
        onSuccess: () => {
          notify.success('Asset saved');
          router.back();
        },
        onError: error => notify.error("Couldn't save", errorMessage(error, 'Try again.')),
      }
    );
  };

  return (
    <Screen>
      <Select
        label="What kind of asset is it?"
        value={type}
        options={TYPE_OPTIONS}
        onChange={setType}
        testID="asset-type"
      />
      <TextField
        label="Describe it"
        value={description}
        onChangeText={setDescription}
        hint={NO_ACCOUNT_NUMBERS}
      />
      <TextField
        label="Where is it held? (optional)"
        value={institution}
        onChangeText={setInstitution}
        hint="For example the bank, registry or company name."
      />
      <TextField
        label="Rough value in naira (optional)"
        value={value}
        onChangeText={setValue}
        keyboardType="numeric"
      />
      <TextField
        label="Notes (optional)"
        value={notes}
        onChangeText={setNotes}
        multiline
        hint={NO_ACCOUNT_NUMBERS}
      />
      <Button
        label="Save asset"
        onPress={handleSave}
        loading={createAsset.isPending}
        disabled={!description.trim()}
        testID="save-asset"
      />
    </Screen>
  );
};
export default AddAssetScreen;
