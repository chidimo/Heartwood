import { useState } from 'react';
import { Modal, Platform, Pressable, Text, useColorScheme, View } from 'react-native';
import DateTimePicker, { DateTimePickerAndroid } from '@react-native-community/datetimepicker';
import { SafeAreaView } from 'react-native-safe-area-context';
import { dateFromIso, formatLongDate, isoFromDate } from '../utils/date';
import { Button } from './button';

interface Props {
  label: string;
  /** "YYYY-MM-DD", or null when no date is set. */
  value: string | null;
  onChange: (value: string | null) => void;
  /** Where the picker starts when there is no value yet. */
  initialDate?: string;
  /** Latest date that can be picked. Defaults to today. */
  maxDate?: Date;
  hint?: string;
  testID?: string;
}

const EARLIEST = new Date(1900, 0, 1);

/**
 * A date chosen with the phone's own picker, never typed: a spinner in a sheet on iOS, the system
 * dialog on Android. (The web build has a typed version: date-field.web.tsx.)
 */
export const DateField = ({
  label,
  value,
  onChange,
  initialDate = '2000-01-01',
  maxDate = new Date(),
  hint,
  testID,
}: Props) => {
  const dark = useColorScheme() === 'dark';
  const [open, setOpen] = useState(false);
  const [draft, setDraft] = useState<Date>(() => dateFromIso(value ?? initialDate));

  const handleOpen = () => {
    const start = dateFromIso(value ?? initialDate);
    if (Platform.OS === 'android') {
      DateTimePickerAndroid.open({
        value: start,
        mode: 'date',
        minimumDate: EARLIEST,
        maximumDate: maxDate,
        onChange: (event, date) => {
          if (event.type === 'set' && date) onChange(isoFromDate(date));
        },
      });
      return;
    }
    setDraft(start);
    setOpen(true);
  };

  const handleDone = () => {
    onChange(isoFromDate(draft));
    setOpen(false);
  };
  const handleClear = () => {
    onChange(null);
    setOpen(false);
  };
  const handleCancel = () => setOpen(false);

  return (
    <View className="gap-1">
      <Text className="text-sm font-medium text-ink dark:text-white">{label}</Text>
      <Pressable
        testID={testID}
        accessibilityRole="button"
        accessibilityLabel={label}
        accessibilityValue={{ text: value ? formatLongDate(value) : 'Not set' }}
        onPress={handleOpen}
        className="h-12 flex-row items-center justify-between rounded-xl border border-primary-600/30 bg-white px-4 dark:bg-primary-900"
      >
        <Text
          className={
            value
              ? 'text-base text-ink dark:text-white'
              : 'text-base text-ink/50 dark:text-white/50'
          }
        >
          {value ? formatLongDate(value) : 'Choose a date'}
        </Text>
        <Text className="text-ink/60 dark:text-white/60">▾</Text>
      </Pressable>
      {hint && <Text className="text-xs text-ink/60 dark:text-white/60">{hint}</Text>}

      <Modal visible={open} animationType="slide" transparent onRequestClose={handleCancel}>
        <Pressable
          accessibilityLabel="Close"
          className="flex-1 bg-black/40"
          onPress={handleCancel}
        />
        <SafeAreaView
          edges={['bottom']}
          className="rounded-t-2xl bg-white px-6 pt-4 dark:bg-primary-900"
        >
          <Text className="pb-2 text-sm font-medium text-ink/60 dark:text-white/60">{label}</Text>
          <DateTimePicker
            value={draft}
            mode="date"
            display="spinner"
            minimumDate={EARLIEST}
            maximumDate={maxDate}
            themeVariant={dark ? 'dark' : 'light'}
            textColor={dark ? '#ffffff' : '#14211a'}
            onChange={(_, date) => date && setDraft(date)}
          />
          <View className="gap-3 pb-4">
            <Button label="Done" onPress={handleDone} testID="date-done" />
            <View className="flex-row justify-center gap-8">
              <Pressable onPress={handleCancel} accessibilityRole="button">
                <Text className="text-ink/70 dark:text-white/70">Cancel</Text>
              </Pressable>
              {value && (
                <Pressable onPress={handleClear} accessibilityRole="button">
                  <Text className="text-danger">Clear the date</Text>
                </Pressable>
              )}
            </View>
          </View>
        </SafeAreaView>
      </Modal>
    </View>
  );
};
