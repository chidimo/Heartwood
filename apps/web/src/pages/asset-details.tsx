import { useNavigate, useParams } from '@tanstack/react-router';
import { toast } from 'sonner';
import { getErrorMessage } from '../api/client';
import { AssetForm } from '../components/asset-form';
import { Heading } from '../components/layout';
import { QueryState } from '../components/query-state';
import { useAssets, useUpdateAsset } from '../features/api';

export const AssetDetailsPage = () => {
  const { id } = useParams({ strict: false }) as { id: string };
  const assets = useAssets();
  const update = useUpdateAsset(id);
  const navigate = useNavigate();

  return (
    <>
      <Heading>Edit asset</Heading>
      <QueryState query={assets}>
        {list => {
          const existing = list.find(a => a.id === id);
          if (!existing) return <p>This asset is gone.</p>;
          return (
            <AssetForm
              key={existing.id}
              existing={existing}
              submitLabel="Save changes"
              isPending={update.isPending}
              onSubmit={input =>
                update.mutate(input, {
                  onSuccess: () => {
                    toast.success('Saved');
                    void navigate({ to: '/assets/$id', params: { id } });
                  },
                  onError: error =>
                    toast.error(getErrorMessage(error, "Couldn't save. Try again.")),
                })
              }
            />
          );
        }}
      </QueryState>
    </>
  );
};
