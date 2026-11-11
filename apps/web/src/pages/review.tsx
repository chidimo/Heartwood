import { Link } from '@tanstack/react-router';
import {
  SEVERITY_LABELS,
  SEVERITY_ORDER,
  type InventoryIssue,
  type InventoryReport,
} from '@heartwood/shared';
import { Heading } from '../components/layout';
import { QueryState } from '../components/query-state';
import { useReport } from '../features/api';
import { cn } from '../lib/cn';

const SEVERITY_STYLES: Record<InventoryIssue['severity'], string> = {
  error: 'border-danger/50',
  warning: 'border-warning/50',
  info: 'border-primary-600/20',
};

const verdictDetail = (report: InventoryReport): string => {
  if (!report.ok) return 'Fix the items below, then check again.';
  if (report.issues.length === 0) return 'Nothing needs your attention.';
  return 'Nothing blocks a draft. A few things are worth a look.';
};

const IssueBody = ({ issue }: { issue: InventoryIssue }) => (
  <>
    {issue.subject && <p className="mb-1 font-semibold">{issue.subject}</p>}
    <p className="text-ink/80 dark:text-white/80">{issue.message}</p>
  </>
);

/** Each issue opens the thing it is about. */
const IssueRow = ({ issue }: { issue: InventoryIssue }) => {
  const classes = cn(
    'block rounded-xl border p-4 hover:bg-primary-50 dark:hover:bg-primary-900',
    SEVERITY_STYLES[issue.severity]
  );
  if (issue.entity === 'asset' && issue.id) {
    return (
      <Link to="/assets/$id" params={{ id: issue.id }} className={classes}>
        <IssueBody issue={issue} />
      </Link>
    );
  }
  if (issue.entity === 'beneficiary' && issue.id) {
    return (
      <Link to="/beneficiaries" className={classes}>
        <IssueBody issue={issue} />
      </Link>
    );
  }
  return (
    <Link to="/beneficiaries" className={classes}>
      <IssueBody issue={issue} />
    </Link>
  );
};

const ReportBody = ({ report }: { report: InventoryReport }) => (
  <div className="flex flex-col gap-5">
    <div>
      <p className={cn('text-xl font-semibold', report.ok ? 'text-success' : 'text-danger')}>
        {report.ok ? 'Ready for a draft will' : 'Not ready yet'}
      </p>
      <p className="text-ink/70 dark:text-white/70">{verdictDetail(report)}</p>
    </div>
    {SEVERITY_ORDER.map(severity => {
      const issues = report.issues.filter(i => i.severity === severity);
      if (issues.length === 0) return null;
      return (
        <section key={severity} className="flex flex-col gap-2">
          <h2 className="text-sm font-medium uppercase text-ink/60 dark:text-white/60">
            {SEVERITY_LABELS[severity]}
          </h2>
          {issues.map(issue => (
            <IssueRow key={`${issue.code}-${issue.id ?? 'all'}`} issue={issue} />
          ))}
        </section>
      );
    })}
  </div>
);

export const ReviewPage = () => {
  const report = useReport();
  return (
    <>
      <Heading>Review</Heading>
      <QueryState query={report}>{data => <ReportBody report={data} />}</QueryState>
      <section className="flex flex-col gap-1">
        <h2 className="text-lg font-semibold">Everything else</h2>
        <p className="text-ink/70 dark:text-white/70">
          Who gets anything you haven't given to someone in particular.
        </p>
        <Link to="/residuary" className="text-primary-600 hover:underline dark:text-primary-200">
          Choose who gets the rest
        </Link>
      </section>
      <section className="flex flex-col gap-1">
        <h2 className="text-lg font-semibold">Executor and lawyer</h2>
        <p className="text-ink/70 dark:text-white/70">
          Who carries out your will, and who can hold a gift until a condition is met.
        </p>
        <Link to="/executors" className="text-primary-600 hover:underline dark:text-primary-200">
          Manage executor and lawyer
        </Link>
      </section>
    </>
  );
};
