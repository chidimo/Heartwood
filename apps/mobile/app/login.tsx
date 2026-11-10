import { useState } from 'react';
import { Pressable, Text } from 'react-native';
import { Link } from 'expo-router';
import { errorMessage } from '../src/api/client';
import { useAuth } from '../src/auth/auth-context';
import { Button } from '../src/components/button';
import { Screen } from '../src/components/screen';
import { TextField } from '../src/components/text-field';
import { notify } from '../src/notifications/notify';

const LoginScreen = () => {
  const { signIn } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [signingIn, setSigningIn] = useState(false);

  const handleSignIn = async () => {
    setSigningIn(true);
    try {
      await signIn(email.trim(), password);
    } catch (error) {
      notify.error("Couldn't sign in", errorMessage(error, 'Try again.'));
    } finally {
      setSigningIn(false);
    }
  };

  return (
    <Screen>
      <Text className="mt-12 text-3xl font-semibold text-primary-700 dark:text-primary-200">
        Heartwood
      </Text>
      <Text className="text-ink/70 dark:text-white/70">Sign in to your inventory.</Text>
      <TextField
        label="Email"
        value={email}
        onChangeText={setEmail}
        autoCapitalize="none"
        autoComplete="email"
        keyboardType="email-address"
      />
      <TextField
        label="Password"
        value={password}
        onChangeText={setPassword}
        secureTextEntry
        autoComplete="current-password"
      />
      <Button
        label="Sign in"
        onPress={() => void handleSignIn()}
        loading={signingIn}
        disabled={!email || !password}
        testID="sign-in"
      />
      <Link href="/register" asChild>
        <Pressable accessibilityRole="link">
          <Text className="text-center text-primary-600 dark:text-primary-200">
            New here? Create an account
          </Text>
        </Pressable>
      </Link>
    </Screen>
  );
};
export default LoginScreen;
