import { useState } from 'react';
import {
  ASSET_TYPE_LABELS,
  CURRENCIES,
  CURRENCY_LABELS,
  type Currency,
  ASSET_TYPES,
  type AssetDto,
  type AssetInput,
  type AssetType,
  amountToInput,
  parseAmount,
} from '@heartwood/shared';
import { Button } from './button';
import { Screen } from './screen';
import { Select } from './select';
import { AmountField } from './amount-field';
import { TextField } from './text-field';

const CURRENCY_OPTIONS = CURRENCIES.map(value => ({ value, label: CURRENCY_LABELS[value] }));
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
  const [currency, setCurrency] = useState<Currency>(existing?.currency ?? 'NGN');
  const [value, setValue] = useState(amountToInput(existing?.roughValue));
  const [notes, setNotes] = useState(existing?.notes ?? '');

  const handleSave = () => {
    const roughValue = parseAmount(value);
    onSubmit({
      type,
      description: description.trim(),
      institution: institution.trim() || null,
      currency,
      roughValue,
      notes: notes.trim() || null,
    });
  };

  return (
    <Screen
      footer={
        <Button
          label={submitLabel}
          onPress={handleSave}
          loading={isPending}
          disabled={!description.trim()}
          testID="save-asset"
        />
      }
    >
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
      <Select label="Currency" value={currency} options={CURRENCY_OPTIONS} onChange={setCurrency} />
      <AmountField label="Rough value (optional)" value={value} onChangeText={setValue} />
      <TextField
        label="Notes (optional)"
        value={notes}
        onChangeText={setNotes}
        multiline
        hint={NO_ACCOUNT_NUMBERS}
      />
    </Screen>
  );
};
