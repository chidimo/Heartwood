import { Alert } from 'react-native';

/** Asks before something that can't be undone from the app. Runs `onConfirm` only on the destructive choice. */
export const confirmDestructive = (
  title: string,
  message: string,
  confirmLabel: string,
  onConfirm: () => void
) =>
  Alert.alert(title, message, [
    { text: 'Cancel', style: 'cancel' },
    { text: confirmLabel, style: 'destructive', onPress: onConfirm },
  ]);
