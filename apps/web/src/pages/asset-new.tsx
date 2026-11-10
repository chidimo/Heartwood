import { useNavigate } from '@tanstack/react-router';
import { toast } from 'sonner';
import { getErrorMessage } from '../api/client';
import { AssetForm } from '../components/asset-form';
import { Heading } from '../components/layout';
import { useCreateAsset } from '../features/api';

export const AssetNewPage = () => {
  const navigate = useNavigate();
  const createAsset = useCreateAsset();

  return (
    <>
      <Heading>Add an asset</Heading>
      <AssetForm
        submitLabel="Save asset"
        isPending={createAsset.isPending}
        onSubmit={input =>
          createAsset.mutate(input, {
            onSuccess: () => {
              toast.success('Asset saved');
              void navigate({ to: '/assets' });
            },
            onError: error => toast.error(getErrorMessage(error, "Couldn't save. Try again.")),
          })
        }
      />
    </>
  );
};
