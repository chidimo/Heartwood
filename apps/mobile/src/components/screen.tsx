import type { ReactNode } from 'react';
import { KeyboardAvoidingView, Platform, ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

/**
 * A scrollable screen that keeps inputs above the keyboard. No top inset: screens with a navigation
 * header sit below it already, and the sign-in screens add their own top margin.
 */
export const Screen = ({ children }: { children: ReactNode }) => (
  <SafeAreaView edges={['left', 'right', 'bottom']} className="flex-1 bg-white dark:bg-ink">
    <KeyboardAvoidingView
      className="flex-1"
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <ScrollView
        contentContainerClassName="gap-4 p-6"
        keyboardShouldPersistTaps="handled"
        keyboardDismissMode="on-drag"
      >
        {children}
      </ScrollView>
    </KeyboardAvoidingView>
  </SafeAreaView>
);
