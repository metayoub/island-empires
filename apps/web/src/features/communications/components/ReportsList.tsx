import type { ReportSummary } from '@island-empires/shared-types';
import type { ReactNode } from 'react';
import { Badge, Button, EmptyState } from '../../../components/ui';

type ReportsListProps = {
  reports: ReportSummary[];
  pendingReportId?: string;
  onMarkRead?: (reportId: string) => void;
  renderActions?: (report: ReportSummary) => ReactNode;
};

const CATEGORY_LABELS: Record<string, string> = {
  battle: 'Battle',
  trade: 'Trade',
  construction: 'Construction',
  research: 'Research',
  intelligence: 'Intelligence',
  system: 'System',
};

const CATEGORY_VARIANTS: Record<string, 'success' | 'warning' | 'danger' | 'info' | 'neutral'> = {
  battle: 'danger',
  trade: 'success',
  construction: 'info',
  research: 'warning',
  intelligence: 'info',
  system: 'neutral',
};

function formatDate(value: string): string {
  return new Intl.DateTimeFormat(undefined, {
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  }).format(new Date(value));
}

export function ReportsList({
  reports,
  pendingReportId,
  onMarkRead,
  renderActions,
}: ReportsListProps) {
  if (reports.length === 0) {
    return (
      <EmptyState
        title="No reports"
        description="Reports appear here when battles, trades, construction, and research complete."
      />
    );
  }

  return (
    <ul className="space-y-3">
      {reports.map((report) => {
        const category = report.category ?? 'system';

        return (
          <li
            key={report.id}
            className={`rounded-md border p-4 ${
              report.isRead ? 'border-border bg-surface' : 'border-primary/40 bg-primary/10'
            }`}
          >
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-2">
                  <Badge variant={CATEGORY_VARIANTS[category] ?? 'neutral'}>
                    {CATEGORY_LABELS[category] ?? category}
                  </Badge>
                  {!report.isRead ? <Badge variant="warning">Unread</Badge> : null}
                  <span className="text-xs font-semibold text-muted">
                    {formatDate(report.createdAt)}
                  </span>
                </div>
                <p className="mt-2 text-sm font-black text-text">{report.title}</p>
                <p className="mt-1 text-sm leading-6 text-muted">{report.message}</p>
              </div>
              <div className="flex shrink-0 flex-wrap gap-2">
                {renderActions?.(report)}
                {!report.isRead && onMarkRead ? (
                  <Button
                    variant="secondary"
                    className="px-3 py-1.5 text-xs"
                    disabled={pendingReportId === report.id}
                    onClick={() => onMarkRead(report.id)}
                  >
                    Mark Read
                  </Button>
                ) : null}
              </div>
            </div>
          </li>
        );
      })}
    </ul>
  );
}
