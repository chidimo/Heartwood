import { useState } from 'react';
import { Pressable, Text } from 'react-native';
import { Link } from 'expo-router';
import { passwordSchema } from '@heartwood/shared';
import { errorMessage } from '../src/api/client';
import { useAuth } from '../src/auth/auth-context';
import { Button } from '../src/components/button';
import { Screen } from '../src/components/screen';
import { TextField } from '../src/components/text-field';
import { notify } from '../src/notifications/notify';

const RegisterScreen = () => {
  const { register } = useAuth();
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [registering, setRegistering] = useState(false);

  // Shown as they type, once there is something to judge.
  const passwordError =
    password && !passwordSchema.safeParse(password).success ? 'Use 10 to 72 characters' : null;

  const handleRegister = async () => {
    setRegistering(true);
    try {
      await register(name.trim(), email.trim(), password);
    } catch (error) {
      notify.error("Couldn't create your account", errorMessage(error, 'Try again.'));
    } finally {
      setRegistering(false);
    }
  };

  return (
    <Screen>
      <Text className="mt-12 text-3xl font-semibold text-primary-700 dark:text-primary-200">
        Create your account
      </Text>
      <TextField label="Your name" value={name} onChangeText={setName} autoComplete="name" />
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
        autoComplete="new-password"
        hint="At least 10 characters."
        error={passwordError}
      />
      <Button
        label="Create account"
        onPress={() => void handleRegister()}
        loading={registering}
        disabled={!name || !email || !passwordSchema.safeParse(password).success}
        testID="register"
      />
      <Link href="/login" asChild>
        <Pressable accessibilityRole="link">
          <Text className="text-center text-primary-600 dark:text-primary-200">
            Already have an account? Sign in
          </Text>
        </Pressable>
      </Link>
    </Screen>
  );
};
export default RegisterScreen;
