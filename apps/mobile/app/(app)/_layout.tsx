import { Stack } from 'expo-router';
import { useNavColors } from '../../src/theme';

const AppLayout = () => {
  const colors = useNavColors();
  return (
    <Stack
      screenOptions={{
        headerStyle: { backgroundColor: colors.background },
        headerTintColor: colors.text,
        headerBackTitle: 'Back',
        headerTitleStyle: { color: colors.text },
      }}
    >
      <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
      <Stack.Screen name="add-asset" options={{ title: 'Add an asset', presentation: 'modal' }} />
      <Stack.Screen name="asset/[id]" options={{ title: 'Asset' }} />
      <Stack.Screen name="beneficiary" options={{ title: 'Beneficiary', presentation: 'modal' }} />
      <Stack.Screen name="residuary" options={{ title: 'Everything else' }} />
    </Stack>
  );
};
export default AppLayout;
