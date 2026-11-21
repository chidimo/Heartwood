import { useState } from 'react';
import { Link, useNavigate, useParams } from '@tanstack/react-router';
import { toast } from 'sonner';
import { ASSET_TYPE_LABELS, formatValue, type AssetDto } from '@heartwood/shared';
import { getErrorMessage } from '../api/client';
import { AssetForm } from '../components/asset-form';
import { Button } from '../components/button';
import { Distribution } from '../components/distribution';
import { Heading } from '../components/layout';
import { Modal } from '../components/modal';
import { QueryState } from '../components/query-state';
import {
  useAllocations,
  useAsset,
  useBeneficiaries,
  useDeleteAsset,
  useExecutors,
  useUpdateAsset,
} from '../features/api';
import { confirmDestructive } from '../lib/confirm';

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
  const navigate = useNavigate();
  const remove = useDeleteAsset(asset.id);
  const update = useUpdateAsset(asset.id);
  const [isEditing, setIsEditing] = useState(false);

  const handleDelete = () => {
    if (
      !confirmDestructive(
        'Remove this asset? It will be taken off your list, along with how you split it.'
      )
    ) {
      return;
    }
    remove.mutate(undefined, {
      onSuccess: () => {
        toast.success('Asset removed');
        void navigate({ to: '/assets' });
      },
      onError: error => toast.error(getErrorMessage(error, "Couldn't remove. Try again.")),
    });
  };

  return (
    <>
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="flex min-w-0 flex-col gap-1">
          <p className="text-xs uppercase text-primary-600 dark:text-primary-200">
            {ASSET_TYPE_LABELS[asset.type]}
          </p>
          <Heading>{asset.description}</Heading>
          {asset.institution && (
            <p className="text-ink/70 dark:text-white/70">{asset.institution}</p>
          )}
          <p className="text-ink/70 dark:text-white/70">
            {formatValue(asset.roughValue, asset.currency)}
          </p>
          {asset.notes && <p className="mt-2 text-ink/70 dark:text-white/70">{asset.notes}</p>}
        </div>
        <div className="flex shrink-0 flex-wrap items-center gap-3">
          <Link
            to="/assets/$id/edit"
            params={{ id: asset.id }}
            className="flex h-11 items-center rounded-xl bg-primary-600 px-5 font-semibold text-white hover:bg-primary-700"
          >
            Distribute
          </Link>
          <Button variant="secondary" onClick={() => setIsEditing(true)}>
            Details
          </Button>
          <Button variant="danger" onClick={handleDelete} loading={remove.isPending}>
            Remove
          </Button>
        </div>
      </div>
      <h2 className="text-lg font-semibold">Who gets it?</h2>
      <AssetDistribution assetId={asset.id} />
      {isEditing && (
        <Modal title="Edit asset" onClose={() => setIsEditing(false)}>
          <AssetForm
            existing={asset}
            submitLabel="Save changes"
            isPending={update.isPending}
            onSubmit={input =>
              update.mutate(input, {
                onSuccess: () => {
                  toast.success('Saved');
                  setIsEditing(false);
                },
                onError: error => toast.error(getErrorMessage(error, "Couldn't save. Try again.")),
              })
            }
          />
        </Modal>
      )}
    </>
  );
};

export const AssetViewPage = () => {
  const { id } = useParams({ strict: false }) as { id: string };
  const asset = useAsset(id);
  if (asset.isError) return <p>This asset is no longer on your list.</p>;
  return <QueryState query={asset}>{found => <AssetView asset={found} />}</QueryState>;
};
