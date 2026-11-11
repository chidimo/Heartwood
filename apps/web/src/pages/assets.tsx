import { useState } from 'react';
import { Link } from '@tanstack/react-router';
import { toast } from 'sonner';
import { ASSET_TYPE_LABELS, formatValue } from '@heartwood/shared';
import { getErrorMessage } from '../api/client';
import { AssetForm } from '../components/asset-form';
import { Button } from '../components/button';
import { Heading } from '../components/layout';
import { Modal } from '../components/modal';
import { QueryState } from '../components/query-state';
import { useAssets, useCreateAsset } from '../features/api';

export const AssetsPage = () => {
  const assets = useAssets();
  const createAsset = useCreateAsset();
  const [isAdding, setIsAdding] = useState(false);
  return (
    <>
      <div className="flex items-center justify-between">
        <Heading>Assets</Heading>
        <Button onClick={() => setIsAdding(true)}>Add an asset</Button>
      </div>
      <QueryState
        query={assets}
        isEmpty={list => list.length === 0}
        empty={
          <p className="py-8 text-center text-ink/60 dark:text-white/60">
            No assets yet. Add the first thing you own.
          </p>
        }
      >
        {list => (
          <ul className="flex flex-col gap-3">
            {list.map(asset => (
              <li key={asset.id}>
                <Link
                  to="/assets/$id"
                  params={{ id: asset.id }}
                  className="block rounded-xl border border-primary-600/20 p-4 hover:bg-primary-50 dark:hover:bg-primary-900"
                >
                  <p className="text-xs uppercase text-primary-600 dark:text-primary-200">
                    {ASSET_TYPE_LABELS[asset.type]}
                  </p>
                  <p className="font-medium">{asset.description}</p>
                  {asset.institution && (
                    <p className="text-ink/60 dark:text-white/60">{asset.institution}</p>
                  )}
                  <p className="text-ink/60 dark:text-white/60">
                    {formatValue(asset.roughValue, asset.currency)}
                  </p>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </QueryState>
      {isAdding && (
        <Modal title="Add an asset" onClose={() => setIsAdding(false)}>
          <AssetForm
            submitLabel="Save asset"
            isPending={createAsset.isPending}
            onSubmit={input =>
              createAsset.mutate(input, {
                onSuccess: () => {
                  toast.success('Asset saved');
                  setIsAdding(false);
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
