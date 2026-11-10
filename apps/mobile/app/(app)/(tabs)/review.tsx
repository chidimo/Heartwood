import { Pressable, ScrollView, Text, View } from 'react-native';
import { useRouter } from 'expo-router';
import {
  type InventoryIssue,
  type InventoryReport,
  SEVERITY_LABELS,
  SEVERITY_ORDER,
} from '@heartwood/shared';
import { Button } from '../../../src/components/button';
import { QueryState } from '../../../src/components/query-state';
import { useReport } from '../../../src/features/inventory/api';
import { cn } from '../../../src/utils/cn';

const SEVERITY_STYLES: Record<InventoryIssue['severity'], string> = {
  error: 'border-danger/50',
  warning: 'border-amber-500/50',
  info: 'border-primary-600/20',
};

const verdictDetail = (report: InventoryReport): string => {
  if (!report.ok) return 'Fix the items below, then check again.';
  if (report.issues.length === 0) return 'Nothing needs your attention.';
  return 'Nothing blocks a draft. A few things are worth a look.';
};

const Verdict = ({ report }: { report: InventoryReport }) => (
  <View className="gap-1">
    <Text className={cn('text-xl font-semibold', report.ok ? 'text-success' : 'text-danger')}>
      {report.ok ? 'Ready for a draft will' : 'Not ready yet'}
    </Text>
    <Text className="text-ink/70 dark:text-white/70">{verdictDetail(report)}</Text>
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

const ReportBody = ({ report }: { report: InventoryReport }) => {
  const router = useRouter();

  // Each issue opens the thing it is about.
  const handleOpen = (issue: InventoryIssue) => {
    if (issue.entity === 'asset' && issue.id) router.push(`/asset/${issue.id}`);
    if (issue.entity === 'beneficiary' && issue.id) {
      router.push({ pathname: '/beneficiary', params: { id: issue.id } });
    }
    if (issue.entity === 'inventory') router.push('/beneficiary');
  };

  return (
    <View className="gap-5">
      <Verdict report={report} />
      {SEVERITY_ORDER.map(severity => {
        const issues = report.issues.filter(i => i.severity === severity);
        if (issues.length === 0) return null;
        return (
          <View key={severity} className="gap-2">
            <Text className="text-sm font-medium uppercase text-ink/60 dark:text-white/60">
              {SEVERITY_LABELS[severity]}
            </Text>
            {issues.map(issue => (
              <IssueRow
                key={`${issue.code}-${issue.id ?? 'all'}`}
                issue={issue}
                onPress={() => handleOpen(issue)}
              />
            ))}
          </View>
        );
      })}
    </View>
  );
};

const ReviewScreen = () => {
  const router = useRouter();
  const report = useReport();

  return (
    <ScrollView className="flex-1 bg-white dark:bg-ink" contentContainerClassName="gap-6 p-6">
      <QueryState query={report}>{data => <ReportBody report={data} />}</QueryState>
      <View className="gap-2">
        <Text className="text-lg font-semibold text-ink dark:text-white">Everything else</Text>
        <Text className="text-ink/70 dark:text-white/70">
          Who gets anything you haven't given to someone in particular.
        </Text>
        <Button
          label="Choose who gets the rest"
          variant="secondary"
          onPress={() => router.push('/residuary')}
          testID="open-residuary"
        />
      </View>
      <View className="gap-2">
        <Text className="text-lg font-semibold text-ink dark:text-white">Executor and lawyer</Text>
        <Text className="text-ink/70 dark:text-white/70">
          Who carries out your will, and who can hold a gift until a condition is met.
        </Text>
        <Button
          label="Manage executor and lawyer"
          variant="secondary"
          onPress={() => router.push('/executors')}
          testID="open-executors"
        />
      </View>
    </ScrollView>
  );
};
export default ReviewScreen;
