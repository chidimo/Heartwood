import { useColorScheme } from 'react-native';
import { Stack } from 'expo-router';

// The native header doesn't read NativeWind's dark: classes, so it follows the system scheme here.
const COLORS = {
  light: { background: '#ffffff', text: '#14211a' },
  dark: { background: '#14211a', text: '#ffffff' },
};

const AppLayout = () => {
  const colors = COLORS[useColorScheme() === 'dark' ? 'dark' : 'light'];
  return (
    <Stack
      screenOptions={{
        headerStyle: { backgroundColor: colors.background },
        headerTintColor: colors.text,
        headerTitleStyle: { color: colors.text },
      }}
    >
      <Stack.Screen name="index" options={{ title: 'Your assets' }} />
      <Stack.Screen name="add-asset" options={{ title: 'Add an asset', presentation: 'modal' }} />
    </Stack>
  );
};
export default AppLayout;
