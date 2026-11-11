import { useRouter } from 'expo-router';
import { errorMessage } from '../../src/api/client';
import { AssetForm } from '../../src/components/asset-form';
import { useCreateAsset } from '../../src/features/assets/api';
import { notify } from '../../src/notifications/notify';

const AddAssetScreen = () => {
  const router = useRouter();
  const createAsset = useCreateAsset();

  return (
    <AssetForm
      submitLabel="Save asset"
      isPending={createAsset.isPending}
      onSubmit={input =>
        createAsset.mutate(input, {
          onSuccess: () => {
            notify.success('Asset saved');
            router.back();
          },
          onError: error => notify.error("Couldn't save", errorMessage(error, 'Try again.')),
        })
      }
    />
  );
};
export default AddAssetScreen;
