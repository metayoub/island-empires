import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useCallback } from 'react';
import { Alert } from '../../components/ui/Alert';
import { ErrorState } from '../../components/ui/ErrorState';
import { LoadingState } from '../../components/ui/LoadingState';
import { useAppStore } from '../../stores/app.store';
import { markReportRead } from '../communications/communications.api';
import { ActiveConstructionPanel } from './components/ActiveConstructionPanel';
import { BuildingList } from './components/BuildingList';
import { CitizenDistributionPanel } from './components/CitizenDistributionPanel';
import { CitySummaryCard } from './components/CitySummaryCard';
import { CityGrowthSummary } from './components/CityGrowthSummary';
import { HappinessPanel } from './components/HappinessPanel';
import { PopulationPanel } from './components/PopulationPanel';
import { ProductionPanel } from './components/ProductionPanel';
import { ReportsPanel } from './components/ReportsPanel';
import { StorageWarning } from './components/StorageWarning';
import { TransportPanel } from './components/TransportPanel';
import { WorkerAssignmentPanel } from './components/WorkerAssignmentPanel';
import {
  getCities,
  getCityOverview,
  getMovements,
  getReports,
  startBuildingUpgrade,
  startResourceTransport,
} from './city.api';

export function CityDashboard() {
  const queryClient = useQueryClient();
  const selectedCityId = useAppStore((state) => state.selectedCityId);

  const cityOverviewQuery = useQuery({
    queryKey: ['city-overview', selectedCityId],
    queryFn: () => getCityOverview(selectedCityId ?? ''),
    enabled: Boolean(selectedCityId),
    retry: 1,
    refetchInterval: (query) => (query.state.data?.activeConstruction ? 5000 : false),
  });

  const reportsQuery = useQuery({
    queryKey: ['reports'],
    queryFn: getReports,
    retry: 1,
    refetchInterval: 15000,
  });

  const citiesQuery = useQuery({
    queryKey: ['cities'],
    queryFn: getCities,
    retry: 1,
  });

  const movementsQuery = useQuery({
    queryKey: ['movements'],
    queryFn: getMovements,
    retry: 1,
    refetchInterval: 5000,
  });

  const refetchCityState = useCallback(() => {
    void queryClient.invalidateQueries({ queryKey: ['city-overview', selectedCityId] });
    void queryClient.invalidateQueries({ queryKey: ['reports'] });
    void queryClient.invalidateQueries({ queryKey: ['movements'] });
    void queryClient.invalidateQueries({ queryKey: ['quest-overview'] });
    void queryClient.invalidateQueries({ queryKey: ['next-action'] });
  }, [queryClient, selectedCityId]);

  const upgradeMutation = useMutation({
    mutationFn: (buildingType: string) => startBuildingUpgrade(selectedCityId ?? '', buildingType),
    onSuccess: refetchCityState,
  });

  const transportMutation = useMutation({
    mutationFn: (input: {
      destinationCityId: string;
      resources: Parameters<typeof startResourceTransport>[0]['resources'];
    }) =>
      startResourceTransport({
        originCityId: selectedCityId ?? '',
        destinationCityId: input.destinationCityId,
        resources: input.resources,
      }),
    onSuccess: refetchCityState,
  });

  const markReportReadMutation = useMutation({
    mutationFn: markReportRead,
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['reports'] });
      void queryClient.invalidateQueries({ queryKey: ['notifications'] });
    },
  });

  if (cityOverviewQuery.isLoading) {
    return <LoadingState message="Opening city..." />;
  }

  if (cityOverviewQuery.isError || !cityOverviewQuery.data) {
    return <ErrorState onRetry={() => void cityOverviewQuery.refetch()} />;
  }

  return (
    <div className="space-y-6">
      <StorageWarning storage={cityOverviewQuery.data.storage} />
      <ActiveConstructionPanel
        activeConstruction={cityOverviewQuery.data.activeConstruction}
        onComplete={refetchCityState}
      />
      <CitySummaryCard city={cityOverviewQuery.data.city} />
      <div className="grid gap-6 lg:grid-cols-3">
        <PopulationPanel population={cityOverviewQuery.data.population} />
        <HappinessPanel happiness={cityOverviewQuery.data.happiness} />
        <CitizenDistributionPanel citizens={cityOverviewQuery.data.citizens} />
      </div>
      <CityGrowthSummary
        population={cityOverviewQuery.data.population}
        happiness={cityOverviewQuery.data.happiness}
      />
      <ProductionPanel
        production={cityOverviewQuery.data.production}
        storage={cityOverviewQuery.data.storage}
      />
      <TransportPanel
        selectedCityId={cityOverviewQuery.data.city.id}
        cities={citiesQuery.data ?? []}
        movements={movementsQuery.data ?? []}
        isSending={transportMutation.isPending}
        onSend={(input) => transportMutation.mutate(input)}
        onTimerComplete={refetchCityState}
      />
      <WorkerAssignmentPanel
        cityId={cityOverviewQuery.data.city.id}
        population={cityOverviewQuery.data.population}
        citizens={cityOverviewQuery.data.citizens}
        academyLevel={
          cityOverviewQuery.data.buildings.find((building) => building.type === 'academy')?.level ??
          0
        }
      />
      <BuildingList
        buildings={cityOverviewQuery.data.buildings}
        resources={cityOverviewQuery.data.resources}
        activeConstruction={cityOverviewQuery.data.activeConstruction}
        pendingBuildingType={
          typeof upgradeMutation.variables === 'string' && upgradeMutation.isPending
            ? upgradeMutation.variables
            : undefined
        }
        onUpgrade={(buildingType) => upgradeMutation.mutate(buildingType)}
        onTimerComplete={refetchCityState}
      />
      {upgradeMutation.isError ? (
        <Alert variant="danger">{upgradeMutation.error.message}</Alert>
      ) : null}
      {transportMutation.isError ? (
        <Alert variant="danger">{transportMutation.error.message}</Alert>
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
