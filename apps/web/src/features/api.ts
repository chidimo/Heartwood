import { keepPreviousData, useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { draftFileName } from '@heartwood/shared';
import type {
  AllocationDto,
  AllocationEntry,
  AssetDto,
  AssetInput,
  AssetUpdate,
  BeneficiaryDto,
  BeneficiaryInput,
  BeneficiaryUpdate,
  DirectoryPage,
  DraftDocumentKey,
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
import { apiBlob, apiFetch, postJson } from '../api/client';

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
type DirectoryQuery = Partial<Omit<DirectorySearch, 'q'>> & { q?: string };

/** One page of our organisation list, filtered and searched on the server. */
export const useOrganizationDirectory = (search: DirectoryQuery) =>
  useQuery({
    queryKey: ['organization-directory', search],
    queryFn: () => {
      const params = new URLSearchParams();
      for (const [key, value] of Object.entries(search)) {
        if (value !== undefined && value !== '') params.set(key, String(value));
      }
      return apiFetch<DirectoryPage>(`/organization-directory?${params.toString()}`);
    },
    placeholderData: keepPreviousData,
    staleTime: 5 * 60 * 1000,
  });
export const useOrganizationStates = () =>
  useQuery({
    queryKey: ['organization-directory', 'states'],
    queryFn: () => apiFetch<string[]>('/organization-directory/states'),
    staleTime: 60 * 60 * 1000,
  });
export const useDraftWill = () =>
  useQuery({ queryKey: ['draft-will'], queryFn: () => apiFetch<DraftWill>('/draft-will') });

const draftPath = (document: DraftDocumentKey, format: 'pdf' | 'docx') =>
  `/draft-will/${document}.${format}`;

/** One document of the draft as PDF bytes, for the viewer. */
export const useDraftPdf = (document: DraftDocumentKey) =>
  useQuery({
    queryKey: ['draft-pdf', document],
    queryFn: async () => (await apiBlob(draftPath(document, 'pdf'))).arrayBuffer(),
  });

/** Saves a document of the draft through the browser's download, named for whose it is. */
export const downloadDraft = async (
  document: DraftDocumentKey,
  format: 'pdf' | 'docx',
  personName: string
) => {
  const url = URL.createObjectURL(await apiBlob(draftPath(document, format)));
  const link = window.document.createElement('a');
  link.href = url;
  link.download = draftFileName(document, personName, format);
  link.click();
  URL.revokeObjectURL(url);
};

/** Opens the PDF in its own tab, where the browser's viewer can print it with every mark intact. */
export const openDraftPdf = async (document: DraftDocumentKey) => {
  const url = URL.createObjectURL(await apiBlob(draftPath(document, 'pdf')));
  window.open(url, '_blank');
};

export const useAllocations = (assetId: string) =>
  useQuery({
    queryKey: ['allocations', assetId],
    queryFn: () => apiFetch<AllocationDto[]>(`/assets/${assetId}/allocations`),
  });
export const useResiduary = () =>
  useQuery({ queryKey: ['residuary'], queryFn: () => apiFetch<ResiduaryEntry[]>('/residuary') });
/** One page of the review: the verdict and totals are the same on every page. */
export const useReport = (page: number, limit: number) =>
  useQuery({
    queryKey: ['report', page, limit],
    queryFn: () => apiFetch<InventoryReport>(`/inventory/report?page=${page}&limit=${limit}`),
    placeholderData: keepPreviousData,
  });

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

export const useUpdateAsset = (id: string) => {
  const refresh = useRefreshAfterWrite();
  return useMutation({
    mutationFn: (input: AssetUpdate) =>
      apiFetch<AssetDto>(`/assets/${id}`, { method: 'PATCH', body: JSON.stringify(input) }),
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

export const useUpdateProfile = () => {
  const refresh = useRefreshAfterWrite();
  return useMutation({
    mutationFn: (input: ProfileUpdate) =>
      apiFetch<PublicAccount>('/auth/me', { method: 'PATCH', body: JSON.stringify(input) }),
    onSuccess: refresh,
  });
};
