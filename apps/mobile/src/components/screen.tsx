import type { ReactNode } from 'react';
import { KeyboardAvoidingView, Platform, ScrollView, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

interface Props {
  children: ReactNode;
  /** Pinned under the scrolling content, always visible: the Save button of a form. */
  footer?: ReactNode;
}

/**
 * A scrollable screen that keeps inputs above the keyboard. No top inset: screens with a navigation
 * header sit below it already, and the sign-in screens add their own top margin.
 */
export const Screen = ({ children, footer }: Props) => (
  <SafeAreaView edges={['left', 'right', 'bottom']} className="flex-1 bg-white dark:bg-ink">
    <KeyboardAvoidingView
      className="flex-1"
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <ScrollView
        className="flex-1"
        contentContainerClassName="gap-4 p-6"
        keyboardShouldPersistTaps="handled"
        keyboardDismissMode="on-drag"
      >
        {children}
      </ScrollView>
      {footer && (
        <View className="border-t border-primary-600/20 bg-white px-6 py-3 dark:bg-ink">
          {footer}
        </View>
      )}
    </KeyboardAvoidingView>
  </SafeAreaView>
);
