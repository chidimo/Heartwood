import { useInfiniteQuery, useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import type {
  AllocationEntry,
  AllocationDto,
  BeneficiaryDto,
  BeneficiaryInput,
  BeneficiaryUpdate,
  DirectoryPage,
  DraftWill,
  ProfileUpdate,
  PublicAccount,
  DirectorySearch,
  ExecutorDto,
  ExecutorInput,
  ExecutorUpdate,
  InventoryReport,
  ResiduaryEntry,
} from '@heartwood/shared';
import { apiFetch, postJson } from '../../api/client';
import { assetKeys } from '../assets/api';

export const inventoryKeys = {
  beneficiaries: ['beneficiaries'] as const,
  executors: ['executors'] as const,
  allocations: (assetId: string) => ['allocations', assetId] as const,
  residuary: ['residuary'] as const,
  report: ['report'] as const,
};

// Components own the success/failure notifications (docs/standards/mobile.md Rule 5); these hooks only
// fetch and refresh caches. The report depends on nearly everything, so every write refreshes it.

export const useBeneficiaries = () =>
  useQuery({
    queryKey: inventoryKeys.beneficiaries,
    queryFn: () => apiFetch<BeneficiaryDto[]>('/beneficiaries'),
  });

export const useExecutors = () =>
  useQuery({
    queryKey: inventoryKeys.executors,
    queryFn: () => apiFetch<ExecutorDto[]>('/executors'),
  });

type DirectoryFilters = Pick<DirectorySearch, 'type' | 'state'> & { q?: string; limit?: number };

const DIRECTORY_PAGE_SIZE = 20;

/** Our organisation list, a page at a time: `fetchNextPage` appends the next page (infinite scroll). */
export const useOrganizationDirectory = (filters: DirectoryFilters) => {
  const limit = filters.limit ?? DIRECTORY_PAGE_SIZE;
  const query = useInfiniteQuery({
    queryKey: ['organization-directory', { ...filters, limit }],
    queryFn: ({ pageParam }) => {
      const params = new URLSearchParams({ page: String(pageParam), limit: String(limit) });
      if (filters.q) params.set('q', filters.q);
      if (filters.type) params.set('type', filters.type);
      if (filters.state) params.set('state', filters.state);
      return apiFetch<DirectoryPage>(`/organization-directory?${params.toString()}`);
    },
    initialPageParam: 1,
    getNextPageParam: last => (last.page < last.totalPages ? last.page + 1 : undefined),
    staleTime: 5 * 60 * 1000,
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

export const useOrganizationStates = () =>
  useQuery({
    queryKey: ['organization-directory', 'states'],
    queryFn: () => apiFetch<string[]>('/organization-directory/states'),
    staleTime: 60 * 60 * 1000,
  });

export const useDraftWill = () =>
  useQuery({ queryKey: ['draft-will'], queryFn: () => apiFetch<DraftWill>('/draft-will') });

export const useAllocations = (assetId: string) =>
  useQuery({
    queryKey: inventoryKeys.allocations(assetId),
    queryFn: () => apiFetch<AllocationDto[]>(`/assets/${assetId}/allocations`),
  });

export const useResiduary = () =>
  useQuery({
    queryKey: inventoryKeys.residuary,
    queryFn: () => apiFetch<ResiduaryEntry[]>('/residuary'),
  });

const REPORT_PAGE_SIZE = 20;

/** The review, a page of issues at a time: `fetchNextPage` appends the next page (infinite scroll). */
export const useReport = () => {
  const query = useInfiniteQuery({
    queryKey: inventoryKeys.report,
    queryFn: ({ pageParam }) =>
      apiFetch<InventoryReport>(`/inventory/report?page=${pageParam}&limit=${REPORT_PAGE_SIZE}`),
    initialPageParam: 1,
    getNextPageParam: last => (last.page < last.totalPages ? last.page + 1 : undefined),
  });
  const first = query.data?.pages[0];
  return {
    // The verdict and totals are the same on every page, so the first one speaks for all.
    summary: first ? { ok: first.ok, total: first.total, counts: first.counts } : null,
    issues: query.data?.pages.flatMap(page => page.issues) ?? [],
    isPending: query.isPending,
    error: query.error,
    hasNextPage: query.hasNextPage,
    isFetchingNextPage: query.isFetchingNextPage,
    isRefetching: query.isRefetching,
    fetchNextPage: () => void query.fetchNextPage(),
    refetch: () => void query.refetch(),
  };
};

const useRefreshAfterWrite = () => {
  const queryClient = useQueryClient();
  return () => queryClient.invalidateQueries();
};

export const useCreateBeneficiary = () => {
  const refresh = useRefreshAfterWrite();
  return useMutation({
    mutationFn: (input: Partial<BeneficiaryInput> & Pick<BeneficiaryInput, 'name'>) =>
      postJson<BeneficiaryDto>('/beneficiaries', input),
    onSuccess: refresh,
  });
};

export const useUpdateBeneficiary = (id: string) => {
  const refresh = useRefreshAfterWrite();
  return useMutation({
    mutationFn: (input: BeneficiaryUpdate) =>
      apiFetch<BeneficiaryDto>(`/beneficiaries/${id}`, {
        method: 'PATCH',
        body: JSON.stringify(input),
      }),
    onSuccess: refresh,
  });
};

export const useDeleteBeneficiary = (id: string) => {
  const refresh = useRefreshAfterWrite();
  return useMutation({
    mutationFn: () => apiFetch<void>(`/beneficiaries/${id}`, { method: 'DELETE' }),
    onSuccess: refresh,
  });
};

export const useDeleteAsset = (id: string) => {
  const refresh = useRefreshAfterWrite();
  return useMutation({
    mutationFn: () => apiFetch<void>(`/assets/${id}`, { method: 'DELETE' }),
    onSuccess: refresh,
  });
};

export const useReplaceAllocations = (assetId: string) => {
  const refresh = useRefreshAfterWrite();
  return useMutation({
    mutationFn: (entries: AllocationEntry[]) =>
      apiFetch<AllocationDto[]>(`/assets/${assetId}/allocations`, {
        method: 'PUT',
        body: JSON.stringify({ entries }),
      }),
    onSuccess: refresh,
  });
};

export const useReplaceResiduary = () => {
  const refresh = useRefreshAfterWrite();
  return useMutation({
    mutationFn: (entries: ResiduaryEntry[]) =>
      apiFetch<ResiduaryEntry[]>('/residuary', {
        method: 'PUT',
        body: JSON.stringify({ entries }),
      }),
    onSuccess: refresh,
  });
};

export { assetKeys };

export const useCreateExecutor = () => {
  const refresh = useRefreshAfterWrite();
  return useMutation({
    mutationFn: (input: Partial<ExecutorInput> & Pick<ExecutorInput, 'kind' | 'name'>) =>
      postJson<ExecutorDto>('/executors', input),
    onSuccess: refresh,
  });
};

export const useUpdateExecutor = (id: string) => {
  const refresh = useRefreshAfterWrite();
  return useMutation({
    mutationFn: (input: ExecutorUpdate) =>
      apiFetch<ExecutorDto>(`/executors/${id}`, { method: 'PATCH', body: JSON.stringify(input) }),
    onSuccess: refresh,
  });
};

export const useDeleteExecutor = (id: string) => {
  const refresh = useRefreshAfterWrite();
  return useMutation({
    mutationFn: () => apiFetch<void>(`/executors/${id}`, { method: 'DELETE' }),
    onSuccess: refresh,
  });
};

export const useUpdateProfile = () => {
  const refresh = useRefreshAfterWrite();
  return useMutation({
    mutationFn: (input: ProfileUpdate) =>
      apiFetch<PublicAccount>('/auth/me', { method: 'PATCH', body: JSON.stringify(input) }),
    onSuccess: refresh,
  });
};
