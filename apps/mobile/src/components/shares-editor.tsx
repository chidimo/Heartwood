import { Text, TextInput, View } from 'react-native';
import {
  type BeneficiaryDto,
  beneficiarySubtitle,
  formatTotal,
  totalHundredths,
} from '@heartwood/shared';
import { cn } from '../utils/cn';

interface Props {
  beneficiaries: BeneficiaryDto[];
  /** beneficiary id -> percent as typed */
  shares: Record<string, string>;
  onChange: (shares: Record<string, string>) => void;
}

/** One percentage box per beneficiary, with a running total that turns green at exactly 100%. */
export const SharesEditor = ({ beneficiaries, shares, onChange }: Props) => {
  const complete = totalHundredths(shares) === 10000;

  return (
    <View className="gap-3">
      {beneficiaries.map(b => (
        <View key={b.id} className="flex-row items-center justify-between gap-3">
          <View className="flex-1">
            <Text className="text-base text-ink dark:text-white">{b.name}</Text>
            <Text className="text-xs text-ink/60 dark:text-white/60">{beneficiarySubtitle(b)}</Text>
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
