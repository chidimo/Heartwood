import { Text } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { errorMessage } from '../../../../src/api/client';
import { AssetForm } from '../../../../src/components/asset-form';
import { QueryState } from '../../../../src/components/query-state';
import { useAssets, useUpdateAsset } from '../../../../src/features/assets/api';
import { notify } from '../../../../src/notifications/notify';

const AssetDetailsScreen = () => {
  const { id } = useLocalSearchParams<{ id: string }>();
  const assets = useAssets();
  const update = useUpdateAsset(id);
  const router = useRouter();

  return (
    <QueryState query={assets}>
      {list => {
        const existing = list.find(a => a.id === id);
        if (!existing) {
          return <Text className="p-6 text-ink/70 dark:text-white/70">This asset is gone.</Text>;
        }
        return (
          <AssetForm
            key={existing.id}
            existing={existing}
            submitLabel="Save changes"
            isPending={update.isPending}
            onSubmit={input =>
              update.mutate(input, {
                onSuccess: () => {
                  notify.success('Saved');
                  router.back();
                },
                onError: error => notify.error("Couldn't save", errorMessage(error, 'Try again.')),
              })
            }
          />
        );
      }}
    </QueryState>
  );
};
export default AssetDetailsScreen;
