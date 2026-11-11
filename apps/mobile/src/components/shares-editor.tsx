import { Pressable, Text, TextInput, View } from 'react-native';
import {
  type BeneficiaryDto,
  beneficiarySubtitle,
  formatTotal,
  splitEvenly,
  totalHundredths,
} from '@heartwood/shared';
import { cn } from '../utils/cn';
import { Button } from './button';
import { Select } from './select';

interface Props {
  beneficiaries: BeneficiaryDto[];
  /** beneficiary id -> percent as typed. A key means the person is in the split, even with no number yet. */
  shares: Record<string, string>;
  onChange: (shares: Record<string, string>) => void;
}

/** The people in a split, added one at a time, with a running total that turns green at exactly 100%. */
export const SharesEditor = ({ beneficiaries, shares, onChange }: Props) => {
  const complete = totalHundredths(shares) === 10000;
  const added = Object.keys(shares)
    .map(id => beneficiaries.find(b => b.id === id))
    .filter((b): b is BeneficiaryDto => b !== undefined);
  const available = beneficiaries.filter(b => !(b.id in shares));

  const handleAdd = (id: string) => onChange({ ...shares, [id]: '' });
  const handleRemove = (id: string) =>
    onChange(Object.fromEntries(Object.entries(shares).filter(([key]) => key !== id)));

  return (
    <View className="gap-3">
      {available.length > 0 && (
        <Select
          label="Add a beneficiary"
          value=""
          options={available.map(b => ({ value: b.id, label: b.name }))}
          onChange={handleAdd}
          testID="add-share"
        />
      )}
      {added.length > 1 && (
        <Button
          label="Split evenly"
          variant="secondary"
          onPress={() => onChange(splitEvenly(Object.keys(shares)))}
          testID="split-evenly"
        />
      )}
      {added.length === 0 && (
        <Text className="text-ink/60 dark:text-white/60">
          No one yet. Add the first beneficiary.
        </Text>
      )}
      {added.map(b => (
        <View key={b.id} className="flex-row items-center justify-between gap-3">
          <View className="flex-1">
            <Text className="text-base text-ink dark:text-white">{b.name}</Text>
            <Text className="text-xs text-ink/60 dark:text-white/60">{beneficiarySubtitle(b)}</Text>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={`Remove ${b.name}`}
              onPress={() => handleRemove(b.id)}
            >
              <Text className="pt-1 text-xs text-danger">Remove</Text>
            </Pressable>
          </View>
          <View className="w-28 flex-row items-center rounded-xl border border-primary-600/30 bg-white px-3 dark:bg-primary-900">
            <TextInput
              accessibilityLabel={`Share for ${b.name}`}
              keyboardType="decimal-pad"
              value={shares[b.id] ?? ''}
              onChangeText={text => onChange({ ...shares, [b.id]: text })}
              placeholder="0"
              placeholderTextColor="#8a948d"
              className="h-11 flex-1 text-right text-base text-ink dark:text-white"
            />
            <Text className="ml-1 text-ink/60 dark:text-white/60">%</Text>
          </View>
        </View>
      ))}
      <View className="flex-row items-center justify-between border-t border-primary-600/20 pt-3">
        <Text className="text-sm text-ink/70 dark:text-white/70">Total</Text>
        <Text
          testID="shares-total"
          className={cn(
            'text-base font-semibold',
            complete ? 'text-success' : 'text-ink dark:text-white'
          )}
        >
          {formatTotal(shares)}
        </Text>
      </View>
    </View>
  );
};
