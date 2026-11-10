import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import type { AssetDto, AssetInput } from '@heartwood/shared';
import { apiFetch, postJson } from '../../api/client';

export const assetKeys = { all: ['assets'] as const };

export const useAssets = () =>
  useQuery({ queryKey: assetKeys.all, queryFn: () => apiFetch<AssetDto[]>('/assets') });

// Components own the success/failure notifications (docs/standards/mobile.md Rule 5); this only
// fetches and refreshes the cache.
export const useCreateAsset = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (
      input: Omit<AssetInput, 'institution' | 'notes' | 'roughValue'> & Partial<AssetInput>
    ) => postJson<AssetDto>('/assets', input),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: assetKeys.all }),
  });
};
