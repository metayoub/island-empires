import type {
  ActiveConstructionSummary,
  BuildingVisualState,
  CityViewBuilding,
  CitizenSummary,
  PopulationSummary,
  ResourceBalance,
} from '@island-empires/shared-types';
import { Link } from 'react-router-dom';
import { Alert } from '../../../components/ui/Alert';
import { Badge } from '../../../components/ui/Badge';
import { Button } from '../../../components/ui/Button';
import { Panel } from '../../../components/ui/Panel';
import { Timer } from '../../../components/ui/Timer';
import { BarracksTrainingPanel } from '../../barracks/components/BarracksTrainingPanel';
import { BuildingUpgradeCost } from '../../city/components/BuildingUpgradeCost';
import { WorkerAssignmentControls } from '../../city/components/WorkerAssignmentPanel';
import { SpyAgencyPanel } from '../../scouting/components/SpyAgencyPanel';
import { TradingPostPanel } from '../../trading-post/TradingPostPanel';
import { formatDuration, getUpgradeButtonState } from '../city-view.utils';
import { BuildingArt } from './BuildingArt';
import { BuildingEffectsList } from './BuildingEffectsList';

type BuildingDetailProps = {
  building: CityViewBuilding;
  resources: ResourceBalance;
  activeConstruction: ActiveConstructionSummary | null;
  isPending: boolean;
  upgradeErrorMessage?: string | null;
  onUpgrade: (buildingType: string) => void;
  onTimerComplete: () => void;
  onClose?: () => void;
  workerAssignment?: {
    cityId: string;
    population: PopulationSummary;
    citizens: CitizenSummary;
    academyLevel: number;
  };
};

const STATE_LABELS: Record<BuildingVisualState, string> = {
  not_built: 'Not built',
  idle: 'Idle',
  upgrade_available: 'Upgrade available',
  upgrading: 'Upgrading',
  max_level: 'Max level',
  disabled: 'Coming later',
  selected: 'Selected',
};

const STATE_BADGE_VARIANTS: Record<
  BuildingVisualState,
  'success' | 'warning' | 'danger' | 'info' | 'neutral'
> = {
  not_built: 'neutral',
  idle: 'neutral',
  upgrade_available: 'success',
  upgrading: 'info',
  max_level: 'info',
  disabled: 'neutral',
  selected: 'neutral',
};

export function getBuildingLevelLabel(building: CityViewBuilding): string {
  return building.level > 0 ? `Level ${building.level}` : 'Not built';
}

export function BuildingDetailBody({
  building,
  resources,
  activeConstruction,
  isPending,
  upgradeErrorMessage,
  onUpgrade,
  onTimerComplete,
  workerAssignment,
}: BuildingDetailProps) {
  const buttonState = getUpgradeButtonState(building, resources, activeConstruction, isPending);
  const isFuture = building.visualState === 'disabled';
  const showUpgradeDetails = !isFuture && building.visualState !== 'max_level';
  const showWorkerAssignment =
    building.type === 'city_hall' && building.level > 0 && workerAssignment;

  return (
    <div className="space-y-4">
      <div className="rounded-md border border-border bg-surface/70 p-3">
        <p className="text-[11px] font-black uppercase tracking-wide text-muted">Description</p>
        <p className="mt-1 text-sm leading-6 text-muted">{building.description}</p>
      </div>
      <div className="rounded-md border border-border bg-surface/70 p-3">
        <p className="mb-2 text-[11px] font-black uppercase tracking-wide text-muted">Current Effect</p>
        <BuildingEffectsList effects={building.effects} />
      </div>
      {isFuture ? (
        <p className="rounded-md border border-dashed border-border bg-surface/70 p-3 text-sm font-bold text-muted">
          This building will become useful in a future sprint.
        </p>
      ) : null}
      {showUpgradeDetails ? (
        <div className="space-y-3 rounded-md border border-border bg-surface/70 p-3">
          <div>
            <p className="text-[11px] font-black uppercase tracking-wide text-muted">
              {building.level > 0 ? 'Upgrade cost' : 'Build cost'}
            </p>
            <div className="mt-2">
              <BuildingUpgradeCost cost={building.upgradeCost} />
            </div>
          </div>
          <div className="flex items-center justify-between rounded bg-surface-strong/60 px-3 py-2 text-sm">
            <span className="font-bold text-muted">Duration</span>
            <span className="font-bold text-text">
              {formatDuration(building.upgradeDurationSeconds)}
            </span>
          </div>
        </div>
      ) : null}
      {building.visualState === 'upgrading' && building.upgradeFinishesAt ? (
        <div className="flex items-center justify-between rounded-md border border-primary/20 bg-primary/10 px-3 py-2 text-sm">
          <span className="font-semibold text-primary">Time remaining</span>
          <Timer finishesAt={building.upgradeFinishesAt} onComplete={onTimerComplete} />
        </div>
      ) : null}
      <Button
        variant="primary"
        className="w-full justify-center"
        disabled={buttonState.disabled}
        onClick={() => onUpgrade(building.type)}
      >
        {buttonState.label}
      </Button>
      {building.type === 'port' && building.level > 0 ? (
        <Link
          to="/transport"
          className="block rounded-md border border-primary bg-primary/10 px-4 py-2 text-center text-sm font-bold text-primary transition-colors hover:bg-primary/15"
        >
          Open Transport
        </Link>
      ) : null}
      {building.type === 'trading_post' && building.level > 0 ? <TradingPostPanel /> : null}
      {building.type === 'marketplace' && building.level > 0 ? <TradingPostPanel /> : null}
      {building.type === 'barracks' && building.level > 0 ? <BarracksTrainingPanel /> : null}
      {building.type === 'shipyard' && building.level > 0 ? (
        <BarracksTrainingPanel mode="shipyard" />
      ) : null}
      {building.type === 'spy_agency' && building.level > 0 ? <SpyAgencyPanel /> : null}
      {showWorkerAssignment ? (
        <div className="space-y-3 rounded-md border border-border bg-surface/70 p-3">
          <div>
            <p className="text-[11px] font-black uppercase tracking-wide text-muted">
              Worker Assignment
            </p>
            <p className="mt-1 text-sm font-semibold text-muted">
              Current population: {workerAssignment.population.current} /{' '}
              {workerAssignment.population.capacity}
            </p>
          </div>
          <WorkerAssignmentControls {...workerAssignment} layout="compact" />
        </div>
      ) : null}
      {upgradeErrorMessage ? <Alert variant="danger">{upgradeErrorMessage}</Alert> : null}
    </div>
  );
}

export function BuildingDetailPanel(props: BuildingDetailProps) {
  const { building, onClose } = props;

  return (
    <Panel
      title={building.name}
      subtitle={`${getBuildingLevelLabel(building)} · Civic building`}
      action={
        <span className="flex items-center gap-2">
          <Badge variant={STATE_BADGE_VARIANTS[building.visualState]}>
            {STATE_LABELS[building.visualState]}
          </Badge>
          {onClose ? (
            <button
              type="button"
              aria-label="Close building details"
              onClick={onClose}
              className="flex h-7 w-7 items-center justify-center rounded-full text-muted transition-colors hover:bg-surface-strong hover:text-text focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
            >
              ✕
            </button>
          ) : null}
        </span>
      }
    >
      <div className="flex items-center gap-3 rounded-md border border-border bg-surface/70 p-3">
        <span className="flex h-16 w-20 shrink-0 items-center justify-center rounded-md bg-primary/10 p-1 shadow-inner">
          <BuildingArt
            buildingType={building.type}
            variant={building.level > 0 ? 'built' : building.visualState === 'disabled' ? 'ghost' : 'site'}
          />
        </span>
        <div className="min-w-0">
          <p className="truncate text-sm font-black text-text">{building.name}</p>
          <p className="text-xs font-semibold text-muted">{getBuildingLevelLabel(building)}</p>
          <Badge variant={STATE_BADGE_VARIANTS[building.visualState]}>
            {STATE_LABELS[building.visualState]}
          </Badge>
        </div>
      </div>
      <BuildingDetailBody {...props} />
    </Panel>
  );
}
