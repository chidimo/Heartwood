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
      <Stack.Screen name="(drawer)" options={{ headerShown: false }} />
      <Stack.Screen name="add-asset" options={{ title: 'Add an asset', presentation: 'modal' }} />
      <Stack.Screen name="asset/[id]/index" options={{ title: 'Asset' }} />
      <Stack.Screen name="asset/[id]/edit" options={{ title: 'Edit distribution' }} />
      <Stack.Screen name="asset/[id]/details" options={{ title: 'Edit asset' }} />
      <Stack.Screen name="beneficiary" options={{ title: 'Beneficiary', presentation: 'modal' }} />
      <Stack.Screen
        name="executor"
        options={{ title: 'Executor, lawyer or priest', presentation: 'modal' }}
      />
    </Stack>
  );
};
export default AppLayout;
