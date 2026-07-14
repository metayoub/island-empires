import type {
  ActiveConstructionSummary,
  CityBuildingSummary,
  ResourceBalance,
} from '@island-empires/shared-types';
import { EmptyState } from '../../../components/ui/EmptyState';
import { BuildingCard } from './BuildingCard';

type BuildingListProps = {
  buildings: CityBuildingSummary[];
  resources: ResourceBalance;
  activeConstruction: ActiveConstructionSummary | null;
  pendingBuildingType?: string;
  onUpgrade: (buildingType: string) => void;
  onTimerComplete: () => void;
};

export function BuildingList({
  buildings,
  resources,
  activeConstruction,
  pendingBuildingType,
  onUpgrade,
  onTimerComplete,
}: BuildingListProps) {
  if (buildings.length === 0) {
    return <EmptyState title="No buildings found" description="This city has no buildings yet." />;
  }

  return (
    <section>
      <div className="mb-4 flex items-center justify-between gap-4">
        <h2 className="text-xl font-bold text-text">Buildings</h2>
      </div>
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
        {buildings.map((building) => (
          <BuildingCard
            key={building.id}
            building={building}
            resources={resources}
            activeConstructionBuildingId={activeConstruction?.buildingId}
            isPending={pendingBuildingType === building.type}
            onUpgrade={onUpgrade}
            onTimerComplete={onTimerComplete}
          />
        ))}
      </div>
    </section>
  );
}
