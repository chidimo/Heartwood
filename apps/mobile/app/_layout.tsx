import '../global.css';
import { useState } from 'react';
import { ActivityIndicator, View } from 'react-native';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { Toaster } from 'sonner-native';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ApiError } from '../src/api/client';
import { AuthProvider, useAuth } from '../src/auth/auth-context';

const RETRY_ATTEMPTS = 3;

// A 4xx just repeats the same client error; retry only network failures and 5xx.
const shouldRetry = (failureCount: number, error: unknown) => {
  const status = error instanceof ApiError ? error.status : 0;
  if (status >= 400 && status < 500) return false;
  return failureCount < RETRY_ATTEMPTS;
};

const Routes = () => {
  const { status } = useAuth();
  if (status === 'loading') {
    return (
      <View className="flex-1 items-center justify-center bg-white dark:bg-ink">
        <ActivityIndicator />
      </View>
    );
  }
  const signedIn = status === 'signedIn';
  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Protected guard={signedIn}>
        <Stack.Screen name="(app)" />
      </Stack.Protected>
      <Stack.Protected guard={!signedIn}>
        <Stack.Screen name="login" />
        <Stack.Screen name="register" />
      </Stack.Protected>
    </Stack>
  );
};

const RootLayout = () => {
  const [queryClient] = useState(
    () =>
      new QueryClient({ defaultOptions: { queries: { staleTime: 30_000, retry: shouldRetry } } })
  );
  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <QueryClientProvider client={queryClient}>
        <AuthProvider>
          <StatusBar style="auto" />
          <Routes />
          <Toaster />
        </AuthProvider>
      </QueryClientProvider>
    </GestureHandlerRootView>
  );
};
export default RootLayout;
