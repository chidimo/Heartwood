import { useState } from 'react';
import { Pressable, Text, TextInput, View } from 'react-native';
import type { TextInputProps } from 'react-native';
import { cn } from '../utils/cn';

interface Props extends Omit<TextInputProps, 'onChangeText'> {
  label: string;
  value: string;
  onChangeText: (value: string) => void;
  /** Guidance shown under the field. */
  hint?: string;
  error?: string | null;
}

export const TextField = ({ label, hint, error, multiline, secureTextEntry, ...input }: Props) => {
  const [revealed, setRevealed] = useState(false);
  return (
    <View className="gap-1">
      <Text className="text-sm font-medium text-ink dark:text-white">{label}</Text>
      <View className="justify-center">
        <TextInput
          accessibilityLabel={label}
          placeholderTextColor="#8a948d"
          multiline={multiline}
          secureTextEntry={secureTextEntry && !revealed}
          className={cn(
            'rounded-xl border bg-white px-4 text-base text-ink dark:bg-primary-900 dark:text-white',
            multiline ? 'min-h-24 py-3' : 'h-12',
            secureTextEntry && 'pr-16',
            error ? 'border-danger' : 'border-primary-600/30'
          )}
          {...input}
        />
        {secureTextEntry && (
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={revealed ? `Hide ${label}` : `Show ${label}`}
            onPress={() => setRevealed(!revealed)}
            className="absolute right-4"
          >
            <Text className="text-sm font-medium text-primary-700 dark:text-primary-100">
              {revealed ? 'Hide' : 'Show'}
            </Text>
          </Pressable>
        )}
      </View>
      {hint && !error && <Text className="text-xs text-ink/60 dark:text-white/60">{hint}</Text>}
      {error && <Text className="text-xs text-danger">{error}</Text>}
    </View>
  );
};
