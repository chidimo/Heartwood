import { Link } from '@tanstack/react-router';
import { ASSET_TYPE_LABELS, formatValue } from '@heartwood/shared';
import { Heading } from '../components/layout';
import { QueryState } from '../components/query-state';
import { useAssets } from '../features/api';

export const AssetsPage = () => {
  const assets = useAssets();
  return (
    <>
      <div className="flex items-center justify-between">
        <Heading>Assets</Heading>
        <Link
          to="/assets/new"
          className="flex h-11 items-center rounded-xl bg-primary-600 px-5 font-semibold text-white hover:bg-primary-700"
        >
          Add an asset
        </Link>
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
    </>
  );
};
