import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';
import { Button, ErrorState, LoadingState, Panel } from '../../components/ui';
import { shareSpyReportWithAlliance } from '../scouting/scouting.api';
import { getReports, markReportRead } from './communications.api';
import { ReportsList } from './components/ReportsList';

type ReportCategory = '' | 'battle' | 'trade' | 'construction' | 'research' | 'intelligence' | 'system';

const CATEGORY_OPTIONS: Array<{ id: ReportCategory; label: string }> = [
  { id: '', label: 'All' },
  { id: 'battle', label: 'Battle' },
  { id: 'trade', label: 'Trade' },
  { id: 'construction', label: 'Construction' },
  { id: 'research', label: 'Research' },
  { id: 'intelligence', label: 'Intelligence' },
  { id: 'system', label: 'System' },
];

export function ReportsPage() {
  const queryClient = useQueryClient();
  const [category, setCategory] = useState<ReportCategory>('');

  const reportsQuery = useQuery({
    queryKey: ['reports', category],
    queryFn: () => getReports(category || undefined),
    retry: 1,
    refetchInterval: 15000,
  });

  const markReadMutation = useMutation({
    mutationFn: markReportRead,
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['reports'] });
      void queryClient.invalidateQueries({ queryKey: ['notifications'] });
    },
  });
  const shareMutation = useMutation({
    mutationFn: shareSpyReportWithAlliance,
  });

  return (
    <Panel title="Reports" subtitle="Battle, trade, construction, research, intelligence, and system reports.">
      <div className="flex flex-wrap gap-2">
        {CATEGORY_OPTIONS.map((option) => (
          <Button
            key={option.id || 'all'}
            variant={category === option.id ? 'primary' : 'secondary'}
            onClick={() => setCategory(option.id)}
          >
            {option.label}
          </Button>
        ))}
      </div>
      {reportsQuery.isLoading ? <LoadingState message="Loading reports..." /> : null}
      {reportsQuery.isError ? (
        <ErrorState title="Unable to load reports." onRetry={() => void reportsQuery.refetch()} />
      ) : null}
      {reportsQuery.data ? (
        <ReportsList
          reports={reportsQuery.data}
          pendingReportId={markReadMutation.isPending ? markReadMutation.variables : undefined}
          onMarkRead={(reportId) => markReadMutation.mutate(reportId)}
          renderActions={(report) =>
            report.type === 'spy_report' ? (
              <Button
                variant="secondary"
                className="px-3 py-1.5 text-xs"
                disabled={shareMutation.isPending && shareMutation.variables === report.id}
                onClick={() => shareMutation.mutate(report.id)}
              >
                Share Alliance
              </Button>
            ) : null
          }
        />
      ) : null}
      {shareMutation.isError ? (
        <p className="text-sm font-bold text-danger">{(shareMutation.error as Error).message}</p>
      ) : null}
    </Panel>
  );
}
