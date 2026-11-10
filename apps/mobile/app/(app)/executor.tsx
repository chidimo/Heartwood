import { useState } from 'react';
import { Pressable, Text } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { EXECUTOR_KIND_OPTIONS, type ExecutorDto } from '@heartwood/shared';
import { errorMessage } from '../../src/api/client';
import { Button } from '../../src/components/button';
import { QueryState } from '../../src/components/query-state';
import { Screen } from '../../src/components/screen';
import { Segmented } from '../../src/components/segmented';
import { TextField } from '../../src/components/text-field';
import {
  useCreateExecutor,
  useDeleteExecutor,
  useExecutors,
  useUpdateExecutor,
} from '../../src/features/inventory/api';
import { notify } from '../../src/notifications/notify';
import { confirmDestructive } from '../../src/utils/confirm';

const ExecutorForm = ({ existing }: { existing: ExecutorDto | null }) => {
  const router = useRouter();
  const id = existing?.id ?? '';
  const create = useCreateExecutor();
  const update = useUpdateExecutor(id);
  const remove = useDeleteExecutor(id);

  const [kind, setKind] = useState<ExecutorDto['kind']>(existing?.kind ?? 'lawyer');
  const [name, setName] = useState(existing?.name ?? '');
  const [contact, setContact] = useState(existing?.contact ?? '');

  const handleDone = (message: string) => {
    notify.success(message);
    router.back();
  };
  const handleFailed = (title: string) => (error: unknown) =>
    notify.error(title, errorMessage(error, 'Try again.'));

  const handleSave = () => {
    const payload = { kind, name: name.trim(), contact: contact.trim() || null };
    if (existing) {
      update.mutate(payload, {
        onSuccess: () => handleDone('Saved'),
        onError: handleFailed("Couldn't save"),
      });
      return;
    }
    create.mutate(payload, {
      onSuccess: () => handleDone('Added'),
      onError: handleFailed("Couldn't add"),
    });
  };

  const handleDelete = () =>
    confirmDestructive(
      'Remove this person?',
      `${existing?.name} will be taken off your list. You can't remove someone who is holding a gift until a condition is met.`,
      'Remove',
      () =>
        remove.mutate(undefined, {
          onSuccess: () => handleDone('Removed'),
          onError: handleFailed("Couldn't remove"),
        })
    );

  return (
    <Screen>
      <Segmented value={kind} options={EXECUTOR_KIND_OPTIONS} onChange={setKind} />
      <TextField label="Name" value={name} onChangeText={setName} autoComplete="name" />
      <TextField
        label="Phone or email (optional)"
        value={contact}
        onChangeText={setContact}
        autoCapitalize="none"
      />
      <Button
        label="Save"
        onPress={handleSave}
        loading={create.isPending || update.isPending}
        disabled={!name.trim()}
        testID="save-executor"
      />
      {existing && (
        <Pressable onPress={handleDelete} accessibilityRole="button">
          <Text className="text-center text-danger">Remove this person</Text>
        </Pressable>
      )}
    </Screen>
  );
};

const ExecutorScreen = () => {
  const { id } = useLocalSearchParams<{ id?: string }>();
  const executors = useExecutors();

  return (
    <QueryState query={executors}>
      {list => {
        const existing = id ? (list.find(x => x.id === id) ?? null) : null;
        return <ExecutorForm key={existing?.id ?? 'new'} existing={existing} />;
      }}
    </QueryState>
  );
};
export default ExecutorScreen;
