import { Text, View } from 'react-native';
import { useQuery } from '@tanstack/react-query';
import { ASSET_TYPES } from '@heartwood/shared';
import { apiFetch } from '../src/api/client';
import { QueryState } from '../src/components/query-state';

const HomeScreen = () => {
  const health = useQuery({
    queryKey: ['health'],
    queryFn: () => apiFetch<{ status: string }>('/health'),
  });

  return (
    <View className="flex-1 items-center justify-center gap-3 bg-white p-6 dark:bg-ink">
      <Text className="text-3xl font-semibold text-primary-700 dark:text-primary-200">
        Heartwood
      </Text>
      <Text className="text-ink/70 dark:text-white/70">Scaffold only.</Text>
      <QueryState query={health}>
        {data => <Text className="text-ink dark:text-white">API status: {data.status}</Text>}
      </QueryState>
      <Text className="text-xs text-ink/50 dark:text-white/50">{ASSET_TYPES.join(', ')}</Text>
    </View>
  );
};
export default HomeScreen;
