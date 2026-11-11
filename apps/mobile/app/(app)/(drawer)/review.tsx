import { ActivityIndicator, FlatList, Pressable, RefreshControl, Text, View } from 'react-native';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { type InventoryIssue, SEVERITY_LABELS } from '@heartwood/shared';
import { errorMessage } from '../../../src/api/client';
import { Button } from '../../../src/components/button';
import { ListFooter } from '../../../src/components/list-footer';
import { useReport } from '../../../src/features/inventory/api';
import { cn } from '../../../src/utils/cn';

const SEVERITY_STYLES: Record<InventoryIssue['severity'], string> = {
  error: 'border-danger/50',
  warning: 'border-amber-500/50',
  info: 'border-primary-600/20',
};

const verdictDetail = (ok: boolean, total: number): string => {
  if (!ok) return 'Fix the items below, then check again.';
  if (total === 0) return 'Nothing needs your attention.';
  return 'Nothing blocks a draft. A few things are worth a look.';
};

const Verdict = ({ ok, total }: { ok: boolean; total: number }) => (
  <View className="gap-1 pb-4">
    <Text className={cn('text-xl font-semibold', ok ? 'text-success' : 'text-danger')}>
      {ok ? 'Ready for a draft will' : 'Not ready yet'}
    </Text>
    <Text className="text-ink/70 dark:text-white/70">{verdictDetail(ok, total)}</Text>
  </View>
);

const IssueRow = ({ issue, onPress }: { issue: InventoryIssue; onPress: () => void }) => (
  <Pressable
    accessibilityRole="button"
    onPress={onPress}
    className={cn(
      'rounded-xl border bg-white p-4 dark:bg-primary-900',
      SEVERITY_STYLES[issue.severity]
    )}
  >
    {issue.subject && (
      <Text className="mb-1 text-base font-semibold text-ink dark:text-white">{issue.subject}</Text>
    )}
    <Text className="text-ink/80 dark:text-white/80">{issue.message}</Text>
  </Pressable>
);

/** Where to go from the review: the two things a draft still needs, pinned so they are always in reach. */
const Shortcuts = () => {
  const router = useRouter();
  return (
    <View className="flex-row gap-2 border-t border-primary-600/20 bg-white px-6 py-3 dark:bg-ink">
      <View className="flex-1">
        <Button
          label="Everything else"
          variant="secondary"
          onPress={() => router.push('/residuary')}
          testID="open-residuary"
        />
      </View>
      <View className="flex-1">
        <Button
          label="Executors"
          variant="secondary"
          onPress={() => router.push('/executors')}
          testID="open-executors"
        />
      </View>
    </View>
  );
};

const ReviewScreen = () => {
  const router = useRouter();
  const report = useReport();

  // Each issue opens the thing it is about.
  const handleOpen = (issue: InventoryIssue) => {
    if (issue.entity === 'asset' && issue.id) router.push(`/asset/${issue.id}`);
    if (issue.entity === 'beneficiary' && issue.id) {
      router.push({ pathname: '/beneficiary', params: { id: issue.id } });
    }
    if (issue.entity === 'inventory') router.push('/beneficiaries');
  };

  if (report.isPending) {
    return (
      <View className="flex-1 items-center justify-center bg-white dark:bg-ink">
        <ActivityIndicator />
      </View>
    );
  }
  if (report.error || !report.summary) {
    return (
      <View className="flex-1 bg-white p-6 dark:bg-ink">
        <View className="rounded-xl bg-danger/10 p-4">
          <Text className="text-danger">{errorMessage(report.error)}</Text>
        </View>
      </View>
    );
  }

  const { ok, total } = report.summary;
  return (
    <SafeAreaView edges={['bottom']} className="flex-1 bg-white dark:bg-ink">
      <FlatList
        className="flex-1"
        contentContainerClassName="p-6"
        data={report.issues}
        keyExtractor={issue => `${issue.code}-${issue.id ?? 'all'}`}
        ItemSeparatorComponent={() => <View className="h-2" />}
        ListHeaderComponent={<Verdict ok={ok} total={total} />}
        renderItem={({ item, index }) => {
          // Issues come worst first, so a heading appears wherever the severity changes.
          const startsGroup = index === 0 || report.issues[index - 1]?.severity !== item.severity;
          return (
            <View className="gap-2">
              {startsGroup && (
                <Text className="pt-2 text-sm font-medium uppercase text-ink/60 dark:text-white/60">
                  {SEVERITY_LABELS[item.severity]}
                </Text>
              )}
              <IssueRow issue={item} onPress={() => handleOpen(item)} />
            </View>
          );
        }}
        onEndReached={() => {
          if (report.hasNextPage && !report.isFetchingNextPage) report.fetchNextPage();
        }}
        onEndReachedThreshold={0.5}
        refreshControl={
          <RefreshControl
            refreshing={report.isRefetching && !report.isFetchingNextPage}
            onRefresh={report.refetch}
          />
        }
        ListFooterComponent={<ListFooter isFetchingNextPage={report.isFetchingNextPage} />}
      />
      <Shortcuts />
    </SafeAreaView>
  );
};
export default ReviewScreen;
