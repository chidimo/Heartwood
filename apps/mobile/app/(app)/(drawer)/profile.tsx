import { useState } from 'react';
import { Text } from 'react-native';
import { errorMessage } from '../../../src/api/client';
import { useAuth } from '../../../src/auth/auth-context';
import { Button } from '../../../src/components/button';
import { Screen } from '../../../src/components/screen';
import { TextField } from '../../../src/components/text-field';
import { useUpdateProfile } from '../../../src/features/inventory/api';
import { notify } from '../../../src/notifications/notify';

/** The person's own details: their name and where they live, which the draft will opens with. */
const ProfileScreen = () => {
  const { account, updateAccount } = useAuth();
  const update = useUpdateProfile();
  const [name, setName] = useState(account?.name ?? '');
  const [address, setAddress] = useState(account?.address ?? '');

  const handleSave = () =>
    update.mutate(
      { name: name.trim(), address: address.trim() || null },
      {
        onSuccess: updated => {
          updateAccount(updated);
          notify.success('Profile saved');
        },
        onError: error => notify.error("Couldn't save", errorMessage(error, 'Try again.')),
      }
    );

  return (
    <Screen
      footer={
        <Button
          label="Save"
          onPress={handleSave}
          loading={update.isPending}
          disabled={!name.trim()}
          testID="save-profile"
        />
      }
    >
      <Text className="text-ink/70 dark:text-white/70">
        Your details. Your name and address open your draft will.
      </Text>
      <TextField label="Name" value={name} onChangeText={setName} autoComplete="name" />
      <TextField
        label="Email"
        value={account?.email ?? ''}
        onChangeText={() => {}}
        editable={false}
        hint="You sign in with this. It can't be changed here."
      />
      <TextField
        label="Address"
        value={address}
        onChangeText={setAddress}
        multiline
        autoComplete="street-address"
        hint="Where you live, as it should appear in your will."
      />
    </Screen>
  );
};
export default ProfileScreen;
