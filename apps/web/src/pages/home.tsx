import { useQuery } from '@tanstack/react-query';
import { ASSET_TYPES } from '@heartwood/shared';
import { api } from '../api/client';

export function HomePage() {
  const { isPending, isError } = useQuery({
    queryKey: ['health'],
    queryFn: async () => (await api.get<{ status: string }>('/health')).data,
  });

  const apiStatus = isPending ? 'checking…' : isError ? 'unreachable' : 'ok';

  return (
    <main className="mx-auto max-w-2xl p-8">
      <h1 className="text-3xl font-semibold">Heartwood</h1>
      <p className="mt-2 text-gray-600">Scaffold only. API status: {apiStatus}</p>
      <p className="mt-4 text-sm text-gray-500">Asset types: {ASSET_TYPES.join(', ')}</p>
    </main>
  );
}
