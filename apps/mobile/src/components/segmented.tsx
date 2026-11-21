import { Pressable, Text, View } from 'react-native';
import { cn } from '../utils/cn';

interface Props<T extends string> {
  value: T;
  options: readonly { value: T; label: string }[];
  onChange: (value: T) => void;
}

/** A short row of mutually exclusive choices (two or three). For longer lists use Select. */
export const Segmented = <T extends string>({ value, options, onChange }: Props<T>) => (
  <View className="flex-row rounded-xl border border-primary-600/30 p-1">
    {options.map(option => (
      <Pressable
        key={option.value}
        accessibilityRole="button"
        accessibilityState={{ selected: option.value === value }}
        onPress={() => onChange(option.value)}
        className={cn(
          'flex-1 items-center rounded-lg py-2',
          option.value === value && 'bg-primary-600'
        )}
      >
        <Text
          className={cn(
            'text-sm font-medium',
            option.value === value ? 'text-white' : 'text-ink dark:text-white'
          )}
        >
          {option.label}
        </Text>
      </Pressable>
    ))}
  </View>
);
