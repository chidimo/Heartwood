import { Drawer } from 'expo-router/drawer';
import { DrawerContent } from '../../../src/components/drawer-content';
import { useNavColors } from '../../../src/theme';

const DrawerLayout = () => {
  const colors = useNavColors();
  return (
    <Drawer
      drawerContent={props => <DrawerContent {...props} />}
      screenOptions={{
        headerStyle: { backgroundColor: colors.background },
        headerTintColor: colors.text,
        headerTitleStyle: { color: colors.text },
        // Full width, like the web sidebar on a phone.
        drawerStyle: { backgroundColor: colors.background, width: '100%' },
        drawerActiveTintColor: colors.accent,
        drawerInactiveTintColor: colors.muted,
        drawerLabelStyle: { fontSize: 16, fontWeight: '600' },
      }}
    >
      <Drawer.Screen name="index" options={{ title: 'Assets', drawerLabel: 'Assets' }} />
      <Drawer.Screen
        name="beneficiaries"
        options={{ title: 'Beneficiaries', drawerLabel: 'Beneficiaries' }}
      />
      <Drawer.Screen
        name="organizations"
        options={{ title: 'Organisations', drawerLabel: 'Organisations' }}
      />
      <Drawer.Screen
        name="executors"
        options={{ title: 'Executors and lawyers', drawerLabel: 'Executors and lawyers' }}
      />
      <Drawer.Screen
        name="residuary"
        options={{ title: 'Everything else', drawerLabel: 'Everything else' }}
      />
      <Drawer.Screen name="review" options={{ title: 'Review', drawerLabel: 'Review' }} />
    </Drawer>
  );
};
export default DrawerLayout;
