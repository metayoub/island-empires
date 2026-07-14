import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useCallback, useMemo, useState } from 'react';
import type { CityViewBuilding } from '@island-empires/shared-types';
import { EmptyState } from '../../components/ui/EmptyState';
import { ErrorState } from '../../components/ui/ErrorState';
import { LoadingState } from '../../components/ui/LoadingState';
import { Modal } from '../../components/ui/Modal';
import { Timer } from '../../components/ui/Timer';
import { useAppStore } from '../../stores/app.store';
import { getCityOverview, startBuildingUpgrade } from '../city/city.api';
import { triggerCityBuildingClicked } from './city-view.api';
import { toCityViewBuilding } from './city-view.utils';
import {
  BuildingDetailBody,
  BuildingDetailPanel,
  getBuildingLevelLabel,
} from './components/BuildingDetailPanel';
import { CityScene } from './components/CityScene';
import { CityViewToolbar } from './components/CityViewToolbar';
import { useIsDesktop } from './useIsDesktop';

export function CityViewPage() {
  const queryClient = useQueryClient();
  const selectedCityId = useAppStore((state) => state.selectedCityId);
  const isDesktop = useIsDesktop();

  const [selectedBuildingType, setSelectedBuildingType] = useState<string | null>(null);
  const [showLabels, setShowLabels] = useState(true);

  const cityOverviewQuery = useQuery({
    queryKey: ['city-overview', selectedCityId],
    queryFn: () => getCityOverview(selectedCityId ?? ''),
    enabled: Boolean(selectedCityId),
    retry: 1,
    refetchInterval: (query) => (query.state.data?.activeConstruction ? 5000 : false),
  });

  const refetchCityState = useCallback(() => {
    void queryClient.invalidateQueries({ queryKey: ['city-overview', selectedCityId] });
    void queryClient.invalidateQueries({ queryKey: ['reports'] });
    void queryClient.invalidateQueries({ queryKey: ['quest-overview'] });
    void queryClient.invalidateQueries({ queryKey: ['next-action'] });
  }, [queryClient, selectedCityId]);

  const upgradeMutation = useMutation({
    mutationFn: (buildingType: string) => startBuildingUpgrade(selectedCityId ?? '', buildingType),
    onSuccess: refetchCityState,
  });

  const questTriggerMutation = useMutation({
    mutationFn: (buildingType: string) => triggerCityBuildingClicked(buildingType),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['quest-overview'] });
      void queryClient.invalidateQueries({ queryKey: ['next-action'] });
    },
  });

  const viewBuildings = useMemo(
    () =>
      (cityOverviewQuery.data?.buildings ?? [])
        .map((building) => toCityViewBuilding(building))
        .filter((building): building is CityViewBuilding => building !== null),
    [cityOverviewQuery.data],
  );

  const selectedBuilding =
    viewBuildings.find((building) => building.type === selectedBuildingType) ?? null;

  const handleSelectBuilding = useCallback(
    (buildingType: string) => {
      setSelectedBuildingType(buildingType);
      upgradeMutation.reset();
      if (!questTriggerMutation.isPending) {
        questTriggerMutation.mutate(buildingType);
      }
    },
    [questTriggerMutation, upgradeMutation],
  );

  const handleCloseDetail = useCallback(() => setSelectedBuildingType(null), []);

  if (cityOverviewQuery.isLoading) {
    return <LoadingState message="Preparing your city..." />;
  }

  if (cityOverviewQuery.isError || !cityOverviewQuery.data) {
    return (
      <ErrorState
        title="Unable to load your city view."
        onRetry={() => void cityOverviewQuery.refetch()}
      />
    );
  }

  const overview = cityOverviewQuery.data;
  const academyLevel =
    overview.buildings.find((building) => building.type === 'academy')?.level ?? 0;

  if (viewBuildings.length === 0) {
    return (
      <EmptyState
        title="Your city is still being prepared."
        description="Please refresh in a moment."
      />
    );
  }

  const detailProps = selectedBuilding
    ? {
        building: selectedBuilding,
        resources: overview.resources,
        activeConstruction: overview.activeConstruction,
        isPending: upgradeMutation.isPending,
        upgradeErrorMessage: upgradeMutation.isError ? upgradeMutation.error.message : null,
        onUpgrade: (buildingType: string) => upgradeMutation.mutate(buildingType),
        onTimerComplete: refetchCityState,
        workerAssignment: {
          cityId: overview.city.id,
          population: overview.population,
          citizens: overview.citizens,
          academyLevel,
        },
      }
    : null;

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <h1 className="text-lg font-bold text-text">{overview.city.name}</h1>
          {overview.activeConstruction ? (
            <span className="flex items-center gap-2 rounded-full border border-border bg-surface px-3 py-1 text-sm shadow-sm">
              <span aria-hidden="true">🔨</span>
              <span className="font-semibold text-text">
                {overview.activeConstruction.buildingName} → Lv{' '}
                {overview.activeConstruction.toLevel}
              </span>
              <Timer
                finishesAt={overview.activeConstruction.finishesAt}
                onComplete={refetchCityState}
              />
            </span>
          ) : null}
        </div>
        <CityViewToolbar
          showLabels={showLabels}
          onToggleLabels={() => setShowLabels((current) => !current)}
        />
      </div>

      <div className="relative">
        <CityScene
          buildings={viewBuildings}
          selectedBuildingType={selectedBuildingType}
          showLabels={showLabels}
          onSelectBuilding={handleSelectBuilding}
          onTimerComplete={refetchCityState}
        />
        {isDesktop && detailProps ? (
          <div className="absolute bottom-4 right-4 top-4 z-50 w-[340px] max-w-[44%] overflow-y-auto rounded-lg shadow-2xl">
            <BuildingDetailPanel {...detailProps} onClose={handleCloseDetail} />
          </div>
        ) : null}
        {isDesktop && !detailProps ? (
          <p className="pointer-events-none absolute bottom-5 left-1/2 z-40 -translate-x-1/2 rounded-full border border-[#d6b982] bg-[#fff8e9]/95 px-4 py-1.5 text-sm font-black text-[#5e5145] shadow-lg">
            Click a building in your city to inspect it.
          </p>
        ) : null}
      </div>

      {!isDesktop && detailProps && selectedBuilding ? (
        <Modal
          isOpen
          onClose={handleCloseDetail}
          title={`${selectedBuilding.name} — ${getBuildingLevelLabel(selectedBuilding)}`}
        >
          <BuildingDetailBody {...detailProps} />
        </Modal>
      ) : null}
    </div>
  );
}
