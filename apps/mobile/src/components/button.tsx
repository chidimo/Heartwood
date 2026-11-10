import { ActivityIndicator, Pressable, Text } from 'react-native';
import { cn } from '../utils/cn';

interface Props {
  label: string;
  onPress: () => void;
  variant?: 'primary' | 'secondary';
  /** Shows a spinner and blocks presses while a request is in flight. */
  loading?: boolean;
  disabled?: boolean;
  testID?: string;
}

export const Button = ({
  label,
  onPress,
  variant = 'primary',
  loading,
  disabled,
  testID,
}: Props) => {
  const blocked = disabled || loading;
  return (
    <Pressable
      testID={testID}
      accessibilityRole="button"
      accessibilityState={{ disabled: blocked, busy: loading }}
      disabled={blocked}
      onPress={onPress}
      className={cn(
        'h-12 flex-row items-center justify-center rounded-xl px-5',
        variant === 'primary' ? 'bg-primary-600' : 'border border-primary-600/40',
        blocked && 'opacity-60'
      )}
    >
      {loading && <ActivityIndicator color={variant === 'primary' ? 'white' : undefined} />}
      <Text
        className={cn(
          'text-base font-semibold',
          variant === 'primary' ? 'text-white' : 'text-primary-700 dark:text-primary-200',
          loading && 'ml-2'
        )}
      >
        {label}
      </Text>
    </Pressable>
  );
};
