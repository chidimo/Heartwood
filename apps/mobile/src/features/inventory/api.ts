import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import type {
  AllocationEntry,
  AllocationDto,
  BeneficiaryDto,
  BeneficiaryInput,
  BeneficiaryUpdate,
  InventoryReport,
  ResiduaryEntry,
} from '@heartwood/shared';
import { apiFetch, postJson } from '../../api/client';
import { assetKeys } from '../assets/api';

export const inventoryKeys = {
  beneficiaries: ['beneficiaries'] as const,
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

export const useReport = () =>
  useQuery({
    queryKey: inventoryKeys.report,
    queryFn: () => apiFetch<InventoryReport>('/inventory/report'),
  });

const useRefreshAfterWrite = () => {
  const queryClient = useQueryClient();
  return () => queryClient.invalidateQueries();
};

export const useCreateBeneficiary = () => {
  const refresh = useRefreshAfterWrite();
  return useMutation({
    mutationFn: (
      input: Partial<BeneficiaryInput> & Pick<BeneficiaryInput, 'name' | 'relationship'>
    ) => postJson<BeneficiaryDto>('/beneficiaries', input),
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
