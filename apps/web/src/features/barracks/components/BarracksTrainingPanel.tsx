import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import type { UnitTrainingOption, UnitType } from '@island-empires/shared-types';
import { useState } from 'react';
import archerArt from '../../../assets/img/units/land/archer.png';
import catapultArt from '../../../assets/img/units/land/catapult.png';
import cavalryArt from '../../../assets/img/units/land/cavalry.png';
import militiaArt from '../../../assets/img/units/land/militia.png';
import spearmanArt from '../../../assets/img/units/land/spearman.png';
import swordsmanArt from '../../../assets/img/units/land/swordsman.png';
import ballistaShipArt from '../../../assets/img/units/naval/ballista_ship.png';
import boardingSkiffArt from '../../../assets/img/units/naval/boarding_skiff.png';
import fireShipArt from '../../../assets/img/units/naval/fire_ship.png';
import heavyWarshipArt from '../../../assets/img/units/naval/heavy_warship.png';
import lightGalleyArt from '../../../assets/img/units/naval/light_galley.png';
import warGalleyArt from '../../../assets/img/units/naval/war_galley.png';
import { Alert } from '../../../components/ui/Alert';
import { Button } from '../../../components/ui/Button';
import { LoadingState } from '../../../components/ui/LoadingState';
import { Timer } from '../../../components/ui/Timer';
import { useAppStore } from '../../../stores/app.store';
import {
  getBarracksOverview,
  getShipyardOverview,
  trainShipyardUnits,
  trainUnits,
} from '../barracks.api';

const TRAINING_DISABLED_LABELS: Record<string, string> = {
  BUILDING_REQUIRED: 'Build this building first',
  BUILDING_LEVEL_REQUIRED: 'Upgrade required',
  REQUIREMENT_MISSING: 'Requirement missing',
  TRAINING_BUSY: 'Training in progress',
  NOT_ENOUGH_RESOURCES: 'Not enough resources',
  MAX_QUANTITY_EXCEEDED: 'Too many units at once',
  INVALID_QUANTITY: 'Choose a quantity',
};

const UNIT_ART: Partial<Record<UnitType, string>> = {
  militia: militiaArt,
  spearman: spearmanArt,
  archer: archerArt,
  swordsman: swordsmanArt,
  cavalry: cavalryArt,
  catapult: catapultArt,
  light_ship: lightGalleyArt,
  ram_ship: warGalleyArt,
  light_galley: lightGalleyArt,
  boarding_skiff: boardingSkiffArt,
  ballista_ship: ballistaShipArt,
  war_galley: warGalleyArt,
  fire_ship: fireShipArt,
  heavy_warship: heavyWarshipArt,
};

const RESOURCE_LABELS: Array<keyof UnitTrainingOption['cost']> = [
  'wood',
  'gold',
  'marble',
  'wine',
  'crystal',
  'sulfur',
];

function formatTrainingDuration(seconds: number): string {
  const minutes = Math.floor(seconds / 60);
  const remainingSeconds = seconds % 60;

  return minutes > 0 ? `${minutes}m ${remainingSeconds}s` : `${remainingSeconds}s`;
}

function formatCost(cost: UnitTrainingOption['cost'], quantity = 1): string {
  const parts = RESOURCE_LABELS.filter((resource) => (cost[resource] ?? 0) > 0).map(
    (resource) => `${(cost[resource] ?? 0) * quantity} ${resource}`,
  );

  return parts.length > 0 ? parts.join(' · ') : 'Free';
}

function formatUpkeep(unit: UnitTrainingOption): string {
  if (!unit.upkeep || unit.upkeep.amountPerHour <= 0) {
    return 'No upkeep';
  }

  return `${unit.upkeep.amountPerHour} ${unit.upkeep.resourceType}/h`;
}

function formatUnitStats(unit: UnitTrainingOption): string {
  const speed = `SPD ${unit.speed ?? 0}`;
  const capacity = (unit.capacity ?? 0) > 0 ? ` · CAP ${unit.capacity}` : '';

  return `ATK ${unit.attack} · DEF ${unit.defense} · HP ${unit.health} · ${speed}${capacity}`;
}

function UnitTrainingRow({
  unit,
  maxQuantityPerOrder,
  trainingBusy,
  isPending,
  actionVerb,
  onTrain,
}: {
  unit: UnitTrainingOption;
  maxQuantityPerOrder: number;
  trainingBusy: boolean;
  isPending: boolean;
  actionVerb: string;
  onTrain: (unitType: UnitType, quantity: number) => void;
}) {
  const [quantityText, setQuantityText] = useState('1');
  const maxQuantity = Math.max(1, Math.min(maxQuantityPerOrder, unit.maxAffordable));
  const quantity = Math.floor(Number(quantityText));
  const isValidQuantity =
    Number.isFinite(quantity) && quantity >= 1 && quantity <= maxQuantityPerOrder;
  const canSubmit =
    unit.canTrain && !trainingBusy && !isPending && isValidQuantity && quantity <= unit.maxAffordable;
  const disabledLabel = unit.disabledReason
    ? TRAINING_DISABLED_LABELS[unit.disabledReason] ?? unit.disabledReason
    : !isValidQuantity
      ? 'Choose a quantity'
      : quantity > unit.maxAffordable
        ? 'Not enough resources'
        : null;

  return (
    <div className="rounded-md border border-border bg-surface/60 p-3">
      <div className="flex items-start gap-3">
        <img
          src={UNIT_ART[unit.type] ?? militiaArt}
          alt=""
          className="h-20 w-24 shrink-0 object-contain"
          draggable={false}
        />
        <div className="min-w-0 flex-1">
          <div className="flex items-start justify-between gap-2">
            <div>
              <p className="text-sm font-black text-text">{unit.name}</p>
              <p className="text-xs font-semibold text-muted">{unit.description}</p>
            </div>
            <span className="rounded-full border border-border bg-surface px-2 py-0.5 text-[10px] font-black uppercase tracking-wide text-muted">
              {unit.category === 'naval' ? 'naval combat' : 'combat unit'}
            </span>
          </div>
          <p className="mt-2 text-xs text-muted">{formatUnitStats(unit)}</p>
        </div>
      </div>

      <div className="mt-3 grid gap-2 text-xs sm:grid-cols-2">
        <div className="rounded border border-border bg-surface/70 px-2 py-2">
          <p className="font-black uppercase tracking-wide text-muted">Cost each</p>
          <p className="mt-1 font-semibold text-text">{formatCost(unit.cost)}</p>
        </div>
        <div className="rounded border border-border bg-surface/70 px-2 py-2">
          <p className="font-black uppercase tracking-wide text-muted">Time each</p>
          <p className="mt-1 font-semibold text-text">
            {formatTrainingDuration(unit.trainingSecondsPerUnit)}
          </p>
        </div>
        <div className="rounded border border-border bg-surface/70 px-2 py-2 sm:col-span-2">
          <p className="font-black uppercase tracking-wide text-muted">Upkeep each</p>
          <p className="mt-1 font-semibold text-text">{formatUpkeep(unit)}</p>
        </div>
      </div>

      <div className="mt-2 flex flex-wrap gap-1">
        {(unit.requirements ?? []).map((requirement) => (
          <span
            key={`${unit.type}-${requirement.buildingType}`}
            className={`rounded-full border px-2 py-0.5 text-[10px] font-black uppercase tracking-wide ${
              requirement.met
                ? 'border-success/30 bg-success/10 text-success'
                : 'border-warning/30 bg-warning/10 text-warning'
            }`}
          >
            {requirement.buildingName} Lv {requirement.requiredLevel}
          </span>
        ))}
        {(unit.unlockConditions ?? []).map((condition) => (
          <span
            key={`${unit.type}-${condition.type}-${condition.label}`}
            className={`rounded-full border px-2 py-0.5 text-[10px] font-black uppercase tracking-wide ${
              condition.met !== false
                ? 'border-success/30 bg-success/10 text-success'
                : 'border-warning/30 bg-warning/10 text-warning'
            }`}
          >
            {condition.label}
          </span>
        ))}
      </div>

      <div className="mt-2 flex items-center gap-2">
        <input
          aria-label={`${unit.name} quantity`}
          className="w-20 rounded-md border border-border bg-surface px-3 py-2 text-sm text-text"
          type="number"
          min={1}
          max={maxQuantity}
          value={quantityText}
          onChange={(event) => setQuantityText(event.target.value)}
        />
        <Button
          variant="primary"
          className="flex-1 justify-center px-2 py-2 text-xs"
          disabled={!canSubmit}
          onClick={() => onTrain(unit.type, quantity)}
        >
          {isPending ? `${actionVerb}ing...` : `${actionVerb} ${unit.name}`}
        </Button>
      </div>
      <p className="mt-1 text-xs font-semibold text-muted">
        Total: {formatCost(unit.cost, Number.isFinite(quantity) ? Math.max(1, quantity) : 1)} ·{' '}
        {formatTrainingDuration(
          unit.trainingSecondsPerUnit * (Number.isFinite(quantity) ? Math.max(1, quantity) : 1),
        )}
        {' '}· Can train now: {Math.min(maxQuantityPerOrder, unit.maxAffordable)} · Order limit: {maxQuantityPerOrder}
      </p>
      {disabledLabel && !trainingBusy ? (
        <p className="mt-1 text-xs font-semibold text-muted">{disabledLabel}</p>
      ) : null}
    </div>
  );
}

export function BarracksTrainingPanel({ mode = 'barracks' }: { mode?: 'barracks' | 'shipyard' }) {
  const queryClient = useQueryClient();
  const selectedCityId = useAppStore((state) => state.selectedCityId);
  const isShipyard = mode === 'shipyard';
  const queryKey = isShipyard ? 'shipyard' : 'barracks';

  const barracksQuery = useQuery({
    queryKey: [queryKey, selectedCityId],
    queryFn: () =>
      isShipyard ? getShipyardOverview(selectedCityId ?? '') : getBarracksOverview(selectedCityId ?? ''),
    enabled: Boolean(selectedCityId),
    retry: 1,
    refetchInterval: (query) => (query.state.data?.activeTraining ? 5000 : false),
  });

  const trainMutation = useMutation({
    mutationFn: (input: { unitType: UnitType; quantity: number }) =>
      isShipyard
        ? trainShipyardUnits(selectedCityId ?? '', input)
        : trainUnits(selectedCityId ?? '', input),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: [queryKey, selectedCityId] });
      void queryClient.invalidateQueries({ queryKey: ['city-overview', selectedCityId] });
      void queryClient.invalidateQueries({ queryKey: ['reports'] });
    },
  });

  const refreshBarracks = () => {
    void queryClient.invalidateQueries({ queryKey: [queryKey, selectedCityId] });
    void queryClient.invalidateQueries({ queryKey: ['reports'] });
  };

  if (!selectedCityId) {
    return null;
  }

  if (barracksQuery.isPending) {
    return <LoadingState message={`Loading ${isShipyard ? 'Shipyard' : 'Barracks'}...`} />;
  }

  if (barracksQuery.isError || !barracksQuery.data) {
    return <Alert variant="danger">The training overview could not be loaded.</Alert>;
  }

  const overview = barracksQuery.data;
  const trainingBusy = Boolean(overview.activeTraining);
  const trainingSections = isShipyard
    ? [{ title: 'Build warships', units: overview.units }]
    : [{ title: 'Train troops', units: overview.units }];
  const actionVerb = isShipyard ? 'Build' : 'Train';

  return (
    <div className="space-y-3">
      <div className="rounded-md border border-border bg-surface/70 p-3">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <p className="text-[11px] font-black uppercase tracking-wide text-muted">
            {isShipyard ? 'Your fleet' : 'Your army'}
          </p>
          <p className="rounded-full border border-border bg-surface px-2 py-0.5 text-[10px] font-black uppercase tracking-wide text-muted">
            Order capacity: {overview.maxQuantityPerOrder}
          </p>
        </div>
        <div className="mt-2 grid grid-cols-3 gap-2 text-center text-sm">
          {overview.units.map((unit) => (
            <div key={unit.type}>
              <p className="font-black text-text">{overview.army[unit.type]}</p>
              <p className="text-xs text-muted">{unit.name}</p>
            </div>
          ))}
        </div>
      </div>
      {overview.activeTraining ? (
        <div className="flex items-center justify-between rounded-md border border-primary/20 bg-primary/10 px-3 py-2 text-sm">
          <span className="font-semibold text-primary">
            {isShipyard ? 'Building' : 'Training'} {overview.activeTraining.quantity} ×{' '}
            {overview.activeTraining.unitName}
          </span>
          <Timer finishesAt={overview.activeTraining.finishesAt} onComplete={refreshBarracks} />
        </div>
      ) : null}
      {overview.trainingBonus &&
      (overview.trainingBonus.costReductionPercent > 0 || overview.trainingBonus.timeReductionPercent > 0) ? (
        <div className="rounded-md border border-success/25 bg-success/10 px-3 py-2 text-xs font-bold text-success">
          {overview.trainingBonus.sourceBuildingName} Lv {overview.trainingBonus.sourceBuildingLevel}: -
          {overview.trainingBonus.costReductionPercent}% cost, -
          {overview.trainingBonus.timeReductionPercent}% time
        </div>
      ) : null}
      {trainingSections.map((section) =>
        section.units.length > 0 ? (
          <div key={section.title} className="space-y-2">
            <p className="text-[11px] font-black uppercase tracking-wide text-muted">{section.title}</p>
            {section.units.map((unit) => (
              <UnitTrainingRow
                key={unit.type}
                unit={unit}
                maxQuantityPerOrder={overview.maxQuantityPerOrder}
                trainingBusy={trainingBusy}
                isPending={trainMutation.isPending}
                actionVerb={actionVerb}
                onTrain={(unitType, quantity) => trainMutation.mutate({ unitType, quantity })}
              />
            ))}
          </div>
        ) : null,
      )}
      {trainMutation.isError ? <Alert variant="danger">{trainMutation.error.message}</Alert> : null}
    </div>
  );
}
