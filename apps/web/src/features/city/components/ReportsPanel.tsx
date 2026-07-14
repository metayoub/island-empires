import type { ReportSummary } from '@island-empires/shared-types';
import { Link } from 'react-router-dom';
import { Badge, Button, EmptyState, Panel } from '../../../components/ui';

type ReportsPanelProps = {
  reports: ReportSummary[];
  pendingReportId?: string;
  onMarkRead?: (reportId: string) => void;
};

const REPORT_BORDER_CLASSES: Record<string, string> = {
  pve_battle_victory: 'border-success',
  pve_battle_defeat: 'border-danger',
  army_returned: 'border-secondary',
};

const CATEGORY_LABELS: Record<string, string> = {
  battle: 'Battle',
  trade: 'Trade',
  construction: 'Construction',
  research: 'Research',
  system: 'System',
};

export function ReportsPanel({ reports, pendingReportId, onMarkRead }: ReportsPanelProps) {
  return (
    <Panel
      title="Reports"
      action={
        <Link to="/reports">
          <Button variant="secondary" className="px-3 py-1.5 text-xs">
            View All
          </Button>
        </Link>
      }
    >
      {reports.length === 0 ? (
        <EmptyState
          title="No reports yet"
          description="Reports appear here as things happen in your city."
        />
      ) : (
        <ul className="space-y-3">
          {reports.map((report) => (
            <li
              key={report.id}
              className={`border-l-4 pl-3 ${REPORT_BORDER_CLASSES[report.type] ?? 'border-primary'}`}
            >
              <div className="flex flex-wrap items-center gap-2">
                <Badge variant={report.isRead ? 'neutral' : 'warning'}>
                  {report.isRead ? 'Read' : 'Unread'}
                </Badge>
                <span className="text-xs font-bold uppercase text-muted">
                  {CATEGORY_LABELS[report.category ?? 'system'] ?? report.category}
                </span>
              </div>
              <p className="mt-1 text-sm font-bold text-text">{report.title}</p>
              <p className="text-sm text-muted">{report.message}</p>
              {!report.isRead && onMarkRead ? (
                <Button
                  variant="ghost"
                  className="mt-2 px-2 py-1 text-xs"
                  disabled={pendingReportId === report.id}
                  onClick={() => onMarkRead(report.id)}
                >
                  Mark Read
                </Button>
              ) : null}
            </li>
          ))}
        </ul>
      )}
    </Panel>
  );
}
