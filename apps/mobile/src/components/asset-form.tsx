import { useState } from 'react';
import {
  ASSET_TYPE_LABELS,
  ASSET_TYPES,
  type AssetDto,
  type AssetInput,
  type AssetType,
} from '@heartwood/shared';
import { Button } from './button';
import { Screen } from './screen';
import { Select } from './select';
import { TextField } from './text-field';

const TYPE_OPTIONS = ASSET_TYPES.map(value => ({ value, label: ASSET_TYPE_LABELS[value] }));
const NO_ACCOUNT_NUMBERS = "Don't enter account numbers or PINs. A name is enough.";

interface Props {
  /** The asset being edited, or undefined to add a new one. */
  existing?: AssetDto;
  submitLabel: string;
  isPending: boolean;
  onSubmit: (input: AssetInput) => void;
}

/** The fields of an asset: used to add one and to edit one. */
export const AssetForm = ({ existing, submitLabel, isPending, onSubmit }: Props) => {
  const [type, setType] = useState<AssetType>(existing?.type ?? 'cash');
  const [description, setDescription] = useState(existing?.description ?? '');
  const [institution, setInstitution] = useState(existing?.institution ?? '');
  const [value, setValue] = useState(existing?.roughValue?.toString() ?? '');
  const [notes, setNotes] = useState(existing?.notes ?? '');

  const handleSave = () => {
    const roughValue = value.trim() ? Number(value.replace(/,/g, '')) : null;
    onSubmit({
      type,
      description: description.trim(),
      institution: institution.trim() || null,
      roughValue: roughValue !== null && Number.isFinite(roughValue) ? roughValue : null,
      notes: notes.trim() || null,
    });
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
        label={submitLabel}
        onPress={handleSave}
        loading={isPending}
        disabled={!description.trim()}
        testID="save-asset"
      />
    </Screen>
  );
};
