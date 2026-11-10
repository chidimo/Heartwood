import { Pressable, Text, View } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { ASSET_TYPE_LABELS, formatValue, type AssetDto } from '@heartwood/shared';
import { errorMessage } from '../../../../src/api/client';
import { Button } from '../../../../src/components/button';
import { Distribution } from '../../../../src/components/distribution';
import { QueryState } from '../../../../src/components/query-state';
import { Screen } from '../../../../src/components/screen';
import { useAssets } from '../../../../src/features/assets/api';
import {
  useAllocations,
  useBeneficiaries,
  useDeleteAsset,
  useExecutors,
} from '../../../../src/features/inventory/api';
import { notify } from '../../../../src/notifications/notify';
import { confirmDestructive } from '../../../../src/utils/confirm';

const AssetDistribution = ({ assetId }: { assetId: string }) => {
  const allocations = useAllocations(assetId);
  const beneficiaries = useBeneficiaries();
  const executors = useExecutors();

  return (
    <QueryState query={allocations}>
      {current => (
        <QueryState query={beneficiaries}>
          {people => (
            <QueryState query={executors}>
              {holders => (
                <Distribution allocations={current} beneficiaries={people} executors={holders} />
              )}
            </QueryState>
          )}
        </QueryState>
      )}
    </QueryState>
  );
};

const AssetView = ({ asset }: { asset: AssetDto }) => {
  const router = useRouter();
  const remove = useDeleteAsset(asset.id);

  const handleEdit = () => router.push(`/asset/${asset.id}/edit`);
  const handleDelete = () =>
    confirmDestructive(
      'Remove this asset?',
      'It will be taken off your list, along with how you split it.',
      'Remove',
      () =>
        remove.mutate(undefined, {
          onSuccess: () => {
            notify.success('Asset removed');
            router.back();
          },
          onError: error => notify.error("Couldn't remove", errorMessage(error, 'Try again.')),
        })
    );

  return (
    <Screen>
      <View className="gap-1">
        <Text className="text-xs uppercase text-primary-600 dark:text-primary-200">
          {ASSET_TYPE_LABELS[asset.type]}
        </Text>
        <Text className="text-xl font-semibold text-ink dark:text-white">{asset.description}</Text>
        {asset.institution && (
          <Text className="text-ink/70 dark:text-white/70">{asset.institution}</Text>
        )}
        <Text className="text-ink/70 dark:text-white/70">{formatValue(asset.roughValue)}</Text>
        {asset.notes && <Text className="mt-2 text-ink/70 dark:text-white/70">{asset.notes}</Text>}
      </View>

      <Text className="mt-2 text-lg font-semibold text-ink dark:text-white">Who gets it?</Text>
      <AssetDistribution assetId={asset.id} />

      <Button label="Edit distribution" onPress={handleEdit} testID="edit-distribution" />
      <Pressable onPress={handleDelete} accessibilityRole="button" className="mt-2">
        <Text className="text-center text-danger">Remove this asset</Text>
      </Pressable>
    </Screen>
  );
};

const Gone = () => (
  <Text className="p-6 text-ink/70 dark:text-white/70">This asset is no longer on your list.</Text>
);

const AssetScreen = () => {
  const { id } = useLocalSearchParams<{ id: string }>();
  const assets = useAssets();

  return (
    <QueryState query={assets}>
      {list => {
        const asset = list.find(a => a.id === id);
        if (!asset) return <Gone />;
        return <AssetView asset={asset} />;
      }}
    </QueryState>
  );
};
export default AssetScreen;
