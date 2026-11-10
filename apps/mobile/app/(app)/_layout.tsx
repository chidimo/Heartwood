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
      <Stack.Screen name="asset/[id]/index" options={{ title: 'Asset' }} />
      <Stack.Screen name="asset/[id]/edit" options={{ title: 'Edit distribution' }} />
      <Stack.Screen name="beneficiary" options={{ title: 'Beneficiary', presentation: 'modal' }} />
      <Stack.Screen name="residuary" options={{ title: 'Everything else' }} />
      <Stack.Screen name="executors" options={{ title: 'Executor and lawyer' }} />
      <Stack.Screen
        name="executor"
        options={{ title: 'Executor or lawyer', presentation: 'modal' }}
      />
    </Stack>
  );
};
export default AppLayout;
