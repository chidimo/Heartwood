import { Pressable, Text, View } from 'react-native';
import {
  DrawerContentScrollView,
  DrawerItemList,
  type DrawerContentComponentProps,
} from 'expo-router/drawer';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useAuth } from '../auth/auth-context';

/** The sidebar: the app's sections, then who is signed in and a way to sign out. */
export const DrawerContent = (props: DrawerContentComponentProps) => {
  const { account, signOut } = useAuth();
  const handleSignOut = () => {
    props.navigation.closeDrawer();
    void signOut();
  };
  const initials = (account?.name ?? account?.email ?? '?').slice(0, 2).toUpperCase();

  return (
    <View className="flex-1 bg-white dark:bg-ink">
      <DrawerContentScrollView {...props}>
        <Text className="px-4 pb-3 pt-2 text-2xl font-semibold text-primary-700 dark:text-primary-200">
          Heartwood
        </Text>
        <DrawerItemList {...props} />
      </DrawerContentScrollView>
      <SafeAreaView edges={['bottom']} className="border-t border-primary-600/20">
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Your profile"
          onPress={() => props.navigation.navigate('profile')}
          className="flex-row items-center gap-3 px-4 py-3"
        >
          <View className="h-10 w-10 items-center justify-center rounded-full bg-primary-600/20">
            <Text className="text-xs font-semibold text-primary-700 dark:text-primary-200">
              {initials}
            </Text>
          </View>
          <View className="flex-1">
            <Text numberOfLines={1} className="font-medium text-ink dark:text-white">
              {account?.name}
            </Text>
            <Text numberOfLines={1} className="text-xs text-ink/60 dark:text-white/60">
              {account?.email}
            </Text>
          </View>
        </Pressable>
        <Pressable
          accessibilityRole="button"
          onPress={handleSignOut}
          testID="sign-out"
          className="px-4 pb-4"
        >
          <Text className="text-base font-medium text-ink/70 dark:text-white/70">Sign out</Text>
        </Pressable>
      </SafeAreaView>
    </View>
  );
};
