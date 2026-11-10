import { Tabs } from 'expo-router';
import { useNavColors } from '../../../src/theme';

const TabsLayout = () => {
  const colors = useNavColors();
  return (
    <Tabs
      screenOptions={{
        headerStyle: { backgroundColor: colors.background },
        headerTintColor: colors.text,
        headerTitleStyle: { color: colors.text },
        tabBarStyle: { backgroundColor: colors.background },
        tabBarActiveTintColor: colors.accent,
        tabBarInactiveTintColor: colors.muted,
        tabBarIconStyle: { display: 'none' },
        tabBarLabelStyle: { fontSize: 15, fontWeight: '600', paddingVertical: 10 },
      }}
    >
      <Tabs.Screen name="index" options={{ title: 'Assets' }} />
      <Tabs.Screen name="people" options={{ title: 'People' }} />
      <Tabs.Screen name="review" options={{ title: 'Review' }} />
    </Tabs>
  );
};
export default TabsLayout;
