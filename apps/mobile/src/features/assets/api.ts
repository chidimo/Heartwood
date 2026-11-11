import { useInfiniteQuery, useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import type { AssetDto, AssetInput, AssetPage, AssetSearch, AssetUpdate } from '@heartwood/shared';
import { apiFetch, postJson } from '../../api/client';

export const assetKeys = { all: ['assets'] as const, one: (id: string) => ['asset', id] as const };

type AssetFilters = Pick<AssetSearch, 'type' | 'currency'> & { q?: string };

const ASSET_PAGE_SIZE = 20;

/** The assets, a page at a time: `fetchNextPage` appends the next page (infinite scroll). */
export const useAssets = (filters: AssetFilters) => {
  const query = useInfiniteQuery({
    queryKey: [...assetKeys.all, filters],
    queryFn: ({ pageParam }) => {
      const params = new URLSearchParams({
        page: String(pageParam),
        limit: String(ASSET_PAGE_SIZE),
      });
      if (filters.q) params.set('q', filters.q);
      if (filters.type) params.set('type', filters.type);
      if (filters.currency) params.set('currency', filters.currency);
      return apiFetch<AssetPage>(`/assets?${params.toString()}`);
    },
    initialPageParam: 1,
    getNextPageParam: last => (last.page < last.totalPages ? last.page + 1 : undefined),
  });
  return {
    items: query.data?.pages.flatMap(page => page.items) ?? [],
    total: query.data?.pages[0]?.total ?? 0,
    isPending: query.isPending,
    error: query.error,
    hasNextPage: query.hasNextPage,
    isFetchingNextPage: query.isFetchingNextPage,
    isRefetching: query.isRefetching,
    fetchNextPage: () => void query.fetchNextPage(),
    refetch: () => void query.refetch(),
  };
};

/** One asset, by id: the screens for a single asset need no list. */
export const useAsset = (id: string) =>
  useQuery({ queryKey: assetKeys.one(id), queryFn: () => apiFetch<AssetDto>(`/assets/${id}`) });

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

export const useUpdateAsset = (id: string) => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: AssetUpdate) =>
      apiFetch<AssetDto>(`/assets/${id}`, { method: 'PATCH', body: JSON.stringify(input) }),
    // The report names assets, so it goes stale with them.
    onSuccess: () => queryClient.invalidateQueries(),
  });
};
