import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import type {
  AllocationDto,
  AllocationEntry,
  AssetDto,
  AssetInput,
  BeneficiaryDto,
  BeneficiaryInput,
  BeneficiaryUpdate,
  ExecutorDto,
  ExecutorInput,
  ExecutorUpdate,
  InventoryReport,
  ResiduaryEntry,
} from '@heartwood/shared';
import { apiFetch, postJson } from '../api/client';

// Components own the success and failure toasts (docs/standards/frontend.md Rule 1); these hooks only
// fetch and refresh caches. The report depends on nearly everything, so every write refreshes all of it.

export const useAssets = () =>
  useQuery({ queryKey: ['assets'], queryFn: () => apiFetch<AssetDto[]>('/assets') });
export const useBeneficiaries = () =>
  useQuery({
    queryKey: ['beneficiaries'],
    queryFn: () => apiFetch<BeneficiaryDto[]>('/beneficiaries'),
  });
export const useExecutors = () =>
  useQuery({ queryKey: ['executors'], queryFn: () => apiFetch<ExecutorDto[]>('/executors') });
export const useAllocations = (assetId: string) =>
  useQuery({
    queryKey: ['allocations', assetId],
    queryFn: () => apiFetch<AllocationDto[]>(`/assets/${assetId}/allocations`),
  });
export const useResiduary = () =>
  useQuery({ queryKey: ['residuary'], queryFn: () => apiFetch<ResiduaryEntry[]>('/residuary') });
export const useReport = () =>
  useQuery({ queryKey: ['report'], queryFn: () => apiFetch<InventoryReport>('/inventory/report') });

const useRefreshAfterWrite = () => {
  const queryClient = useQueryClient();
  return () => queryClient.invalidateQueries();
};

export const useCreateAsset = () => {
  const refresh = useRefreshAfterWrite();
  return useMutation({
    mutationFn: (input: Partial<AssetInput> & Pick<AssetInput, 'type' | 'description'>) =>
      postJson<AssetDto>('/assets', input),
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
