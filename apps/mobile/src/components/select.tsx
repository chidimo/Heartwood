import { useState } from 'react';
import { FlatList, Modal, Pressable, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { cn } from '../utils/cn';

export interface SelectOption<T extends string> {
  value: T;
  label: string;
}

interface Props<T extends string> {
  label: string;
  value: T;
  options: readonly SelectOption<T>[];
  onChange: (value: T) => void;
  testID?: string;
}

/** A dropdown: a field showing the current choice that opens the list of options in a sheet. */
export const Select = <T extends string>({ label, value, options, onChange, testID }: Props<T>) => {
  const [open, setOpen] = useState(false);
  const selected = options.find(option => option.value === value);

  const handleOpen = () => setOpen(true);
  const handleClose = () => setOpen(false);
  const handlePick = (next: T) => {
    onChange(next);
    setOpen(false);
  };

  return (
    <View className="gap-1">
      <Text className="text-sm font-medium text-ink dark:text-white">{label}</Text>
      <Pressable
        testID={testID}
        accessibilityRole="button"
        accessibilityLabel={label}
        accessibilityValue={{ text: selected?.label }}
        onPress={handleOpen}
        className="h-12 flex-row items-center justify-between rounded-xl border border-primary-600/30 bg-white px-4 dark:bg-primary-900"
      >
        <Text className="text-base text-ink dark:text-white">{selected?.label ?? 'Choose…'}</Text>
        <Text className="text-ink/60 dark:text-white/60">▾</Text>
      </Pressable>

      <Modal visible={open} animationType="slide" transparent onRequestClose={handleClose}>
        <Pressable
          accessibilityLabel="Close"
          className="flex-1 bg-black/40"
          onPress={handleClose}
        />
        <SafeAreaView edges={['bottom']} className="rounded-t-2xl bg-white dark:bg-primary-900">
          <Text className="px-6 pb-2 pt-4 text-sm font-medium text-ink/60 dark:text-white/60">
            {label}
          </Text>
          <FlatList
            data={options}
            keyExtractor={option => option.value}
            renderItem={({ item }) => (
              <Pressable
                accessibilityRole="menuitem"
                accessibilityState={{ selected: item.value === value }}
                onPress={() => handlePick(item.value)}
                className="flex-row items-center justify-between px-6 py-4"
              >
                <Text
                  className={cn(
                    'text-base text-ink dark:text-white',
                    item.value === value && 'font-semibold text-primary-600 dark:text-primary-200'
                  )}
                >
                  {item.label}
                </Text>
                {item.value === value && (
                  <Text className="text-primary-600 dark:text-primary-200">✓</Text>
                )}
              </Pressable>
            )}
          />
        </SafeAreaView>
      </Modal>
    </View>
  );
};
