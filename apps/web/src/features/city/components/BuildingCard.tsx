import type { CityBuildingSummary, ResourceBalance } from '@island-empires/shared-types';
import { Badge } from '../../../components/ui/Badge';
import { Button } from '../../../components/ui/Button';
import { Card } from '../../../components/ui/Card';
import { Timer } from '../../../components/ui/Timer';
import { BuildingUpgradeCost } from './BuildingUpgradeCost';

type BuildingCardProps = {
  building: CityBuildingSummary;
  resources: ResourceBalance;
  activeConstructionBuildingId?: string;
  isPending: boolean;
  onUpgrade: (buildingType: string) => void;
  onTimerComplete: () => void;
};

const RESOURCE_KEYS: Array<keyof ResourceBalance> = [
  'wood',
  'gold',
  'marble',
  'wine',
  'crystal',
  'sulfur',
];

function formatDuration(seconds?: number): string {
  if (!seconds) {
    return 'Unavailable';
  }

  const minutes = Math.floor(seconds / 60);
  const remainingSeconds = seconds % 60;

  return minutes > 0 ? `${minutes}m ${remainingSeconds}s` : `${remainingSeconds}s`;
}

export function BuildingCard({
  building,
  resources,
  activeConstructionBuildingId,
  isPending,
  onUpgrade,
  onTimerComplete,
}: BuildingCardProps) {
  const isBuilt = building.level > 0;
  const isUpgrading = building.status === 'upgrading';
  const hasInsufficientResources = RESOURCE_KEYS.some(
    (resourceType) => resources[resourceType] < (building.upgradeCost?.[resourceType] ?? 0),
  );
  const isConstructionBusy =
    Boolean(activeConstructionBuildingId) && activeConstructionBuildingId !== building.id;
  const buttonLabel = isUpgrading
    ? 'Upgrading...'
    : hasInsufficientResources && building.canUpgrade
      ? 'Not enough resources'
      : building.disabledReason
        ? building.disabledReason
        : isBuilt
          ? 'Upgrade'
          : 'Build';
  const isDisabled =
    isPending || isUpgrading || isConstructionBusy || !building.canUpgrade || hasInsufficientResources;

  return (
    <Card className="flex min-h-[260px] flex-col transition-all duration-200 hover:-translate-y-0.5 hover:shadow-xl">
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-start gap-3">
          <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-md border border-border bg-primary/10 text-sm font-black text-primary shadow-inner">
            B
          </span>
          <div>
            <h3 className="text-lg font-black text-text">{building.name}</h3>
            <p className="mt-1 text-sm font-bold text-muted">
              {isBuilt ? `Level ${building.level}` : 'Not built'}
            </p>
          </div>
        </div>
        <Badge variant={isUpgrading ? 'info' : 'neutral'}>{building.status}</Badge>
      </div>
      <p className="mt-4 text-sm leading-6 text-muted">{building.description}</p>
      <div className="mt-4 space-y-3">
        <BuildingUpgradeCost cost={building.upgradeCost} />
        <div className="flex items-center justify-between rounded-md border border-border bg-surface/70 px-3 py-2 text-sm shadow-inner">
          <span className="font-bold text-muted">Duration</span>
          <span className="font-black text-text">{formatDuration(building.upgradeDurationSeconds)}</span>
        </div>
        {isUpgrading && building.upgradeFinishesAt ? (
          <div className="flex items-center justify-between rounded-md border border-primary/20 bg-primary/10 px-3 py-2 text-sm">
            <span className="font-bold text-primary">Time remaining</span>
            <Timer finishesAt={building.upgradeFinishesAt} onComplete={onTimerComplete} />
          </div>
        ) : null}
      </div>
      <Button
        variant="primary"
        className="mt-auto w-full"
        disabled={isDisabled}
        onClick={() => onUpgrade(building.type)}
      >
        {buttonLabel}
      </Button>
    </Card>
  );
}
