import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';
import type { ReportSummary } from '@island-empires/shared-types';
import { Alert, Badge, Button, EmptyState, ErrorState, LoadingState, Panel, Timer } from '../../components/ui';
import { useAppStore } from '../../stores/app.store';
import { getReports, markReportRead } from '../communications/communications.api';
import { ReportsList } from '../communications/components/ReportsList';
import { SpyAgencyPanel } from './components/SpyAgencyPanel';
import { getSpyMissions, shareSpyReportWithAlliance, SPY_MISSION_LABELS } from './scouting.api';

type TabId = 'spies' | 'missions' | 'reports';

const TABS: Array<{ id: TabId; label: string }> = [
  { id: 'spies', label: 'My Spies' },
  { id: 'missions', label: 'Active Missions' },
  { id: 'reports', label: 'Spy Reports' },
];

function formatDate(value?: string): string {
  if (!value) return 'Pending';
  return new Intl.DateTimeFormat(undefined, {
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  }).format(new Date(value));
}

function MissionList() {
  const missionsQuery = useQuery({
    queryKey: ['spy-missions'],
    queryFn: getSpyMissions,
    retry: 1,
    refetchInterval: (query) =>
      query.state.data?.missions.some((mission) =>
        ['in_transit', 'returning'].includes(mission.status),
      )
        ? 5000
        : false,
  });

  if (missionsQuery.isPending) return <LoadingState message="Loading spy missions..." />;
  if (missionsQuery.isError || !missionsQuery.data) {
    return <ErrorState title="Unable to load spy missions." onRetry={() => void missionsQuery.refetch()} />;
  }
  if (missionsQuery.data.missions.length === 0) {
    return <EmptyState title="No spy missions" description="Scout a foreign city from the island view." />;
  }

  return (
    <div className="space-y-3">
      {missionsQuery.data.missions.map((mission) => (
        <div key={mission.id} className="rounded-md border border-border bg-surface p-4">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <div className="flex flex-wrap items-center gap-2">
                <Badge variant={mission.status === 'completed' ? 'success' : 'info'}>
                  {mission.status.replace('_', ' ')}
                </Badge>
                <span className="text-xs font-semibold text-muted">
                  {SPY_MISSION_LABELS[mission.missionType]}
                </span>
              </div>
              <p className="mt-2 text-sm font-black text-text">
                {mission.originCityName ?? 'Origin city'} → {mission.targetCityName ?? 'Target city'}
              </p>
              <p className="mt-1 text-xs font-semibold text-muted">
                Success {Math.round(mission.successChance * 100)}% · Detection{' '}
                {Math.round(mission.detectionChance * 100)}% · Started {formatDate(mission.createdAt)}
              </p>
            </div>
            {mission.arrivalTime && ['in_transit', 'returning'].includes(mission.status) ? (
              <Timer finishesAt={mission.arrivalTime} />
            ) : mission.wasSuccessful !== null && mission.wasSuccessful !== undefined ? (
              <Badge variant={mission.wasSuccessful ? 'success' : 'warning'}>
                {mission.wasSuccessful ? 'Success' : 'Failed'}
              </Badge>
            ) : null}
          </div>
        </div>
      ))}
    </div>
  );
}

function SpyReports() {
  const queryClient = useQueryClient();
  const reportsQuery = useQuery({
    queryKey: ['reports', 'intelligence'],
    queryFn: () => getReports('intelligence'),
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
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['alliances'] });
    },
  });

  if (reportsQuery.isPending) return <LoadingState message="Loading spy reports..." />;
  if (reportsQuery.isError || !reportsQuery.data) {
    return <ErrorState title="Unable to load spy reports." onRetry={() => void reportsQuery.refetch()} />;
  }

  const spyReports = reportsQuery.data.filter((report) => report.type === 'spy_report');

  return (
    <div className="space-y-3">
      {shareMutation.isError ? (
        <Alert variant="danger">{(shareMutation.error as Error).message}</Alert>
      ) : null}
      <ReportsList
        reports={spyReports as ReportSummary[]}
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
    </div>
  );
}

export function ScoutingPage() {
  const selectedCityId = useAppStore((state) => state.selectedCityId);
  const [tab, setTab] = useState<TabId>('spies');

  return (
    <main className="mx-auto w-full max-w-6xl space-y-4">
      <div className="game-surface game-frame rounded-lg p-4">
        <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
          <div>
            <h1 className="text-2xl font-black text-text">Scouting</h1>
            <p className="text-sm font-semibold text-muted">
              Train spies, track intelligence missions, and review scouting reports.
            </p>
          </div>
          <div role="tablist" className="flex flex-wrap gap-2">
            {TABS.map((option) => (
              <button
                key={option.id}
                type="button"
                role="tab"
                aria-selected={tab === option.id}
                onClick={() => setTab(option.id)}
                className={`rounded-md border px-3 py-2 text-sm font-bold ${
                  tab === option.id
                    ? 'border-primary bg-primary text-white'
                    : 'border-border bg-surface text-muted hover:text-text'
                }`}
              >
                {option.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {tab === 'spies' ? (
        <Panel title="My Spies" subtitle="Spy storage and training are tracked per city.">
          {selectedCityId ? <SpyAgencyPanel /> : <EmptyState title="No city selected" description="Select a city to manage spies." />}
        </Panel>
      ) : null}
      {tab === 'missions' ? (
        <Panel title="Active Missions" subtitle="Outbound and returning spy movements.">
          <MissionList />
        </Panel>
      ) : null}
      {tab === 'reports' ? (
        <Panel title="Spy Reports" subtitle="Intelligence reports can be shared with your alliance.">
          <SpyReports />
        </Panel>
      ) : null}
    </main>
  );
}
