import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Alert } from '../../components/ui/Alert';
import { ErrorState } from '../../components/ui/ErrorState';
import { LoadingState } from '../../components/ui/LoadingState';
import { ReportsPanel } from '../city/components/ReportsPanel';
import { getReports } from '../city/city.api';
import { markReportRead } from '../communications/communications.api';
import { ActiveResearchPanel } from './components/ActiveResearchPanel';
import { ResearchSummaryPanel } from './components/ResearchSummaryPanel';
import { TechnologyList } from './components/TechnologyList';
import { getResearchOverview, startResearch } from './research.api';

export function ResearchPage() {
  const queryClient = useQueryClient();

  const researchQuery = useQuery({
    queryKey: ['research-overview'],
    queryFn: getResearchOverview,
    retry: 1,
    refetchInterval: (query) => (query.state.data?.activeResearch ? 5000 : false),
  });

  const reportsQuery = useQuery({
    queryKey: ['reports'],
    queryFn: getReports,
    retry: 1,
    refetchInterval: 15000,
  });

  const refetchResearchState = () => {
    void queryClient.invalidateQueries({ queryKey: ['research-overview'] });
    void queryClient.invalidateQueries({ queryKey: ['reports'] });
    void queryClient.invalidateQueries({ queryKey: ['quest-overview'] });
    void queryClient.invalidateQueries({ queryKey: ['next-action'] });
  };

  const startResearchMutation = useMutation({
    mutationFn: (technologyId: string) => startResearch(technologyId),
    onSuccess: refetchResearchState,
  });

  const markReportReadMutation = useMutation({
    mutationFn: markReportRead,
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['reports'] });
      void queryClient.invalidateQueries({ queryKey: ['notifications'] });
    },
  });

  if (researchQuery.isLoading) {
    return <LoadingState message="Opening research..." />;
  }

  if (researchQuery.isError || !researchQuery.data) {
    return <ErrorState onRetry={() => void researchQuery.refetch()} />;
  }

  return (
    <div className="space-y-6">
      <ResearchSummaryPanel
        researchPoints={researchQuery.data.researchPoints}
        researchPointsPerHour={researchQuery.data.researchPointsPerHour}
        scientists={researchQuery.data.scientists}
        academyLevel={researchQuery.data.academyLevel}
      />
      <ActiveResearchPanel
        activeResearch={researchQuery.data.activeResearch}
        onComplete={refetchResearchState}
      />
      <TechnologyList
        technologies={researchQuery.data.technologies}
        categories={researchQuery.data.categories ?? []}
        researchPoints={researchQuery.data.researchPoints}
        pendingTechnologyId={
          startResearchMutation.isPending ? startResearchMutation.variables : undefined
        }
        onStart={(technologyId) => startResearchMutation.mutate(technologyId)}
      />
      {startResearchMutation.isError ? (
        <Alert variant="danger">{startResearchMutation.error.message}</Alert>
      ) : null}
      <ReportsPanel
        reports={reportsQuery.data ?? []}
        pendingReportId={
          markReportReadMutation.isPending ? markReportReadMutation.variables : undefined
        }
        onMarkRead={(reportId) => markReportReadMutation.mutate(reportId)}
      />
    </div>
  );
}
