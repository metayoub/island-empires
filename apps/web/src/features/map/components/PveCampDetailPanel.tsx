import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import type { ArmyUnits, PveRewards, UnitType } from '@island-empires/shared-types';
import { useState } from 'react';
import {
  Alert,
  Badge,
  Button,
  ErrorState,
  LoadingState,
  Modal,
  Panel,
} from '../../../components/ui';
import { attackPveCamp, getPveCampDetail } from '../pve.api';

const EMPTY_ARMY: ArmyUnits = {};

const STRENGTH_BADGE_VARIANTS: Record<string, 'success' | 'warning' | 'danger' | 'info' | 'neutral'> = {
  Low: 'success',
  Medium: 'warning',
  High: 'danger',
};
const RESOURCE_KEYS: Array<keyof PveRewards> = ['wood', 'gold', 'marble', 'sulfur', 'crystal', 'wine'];

function formatTravelTime(seconds: number): string {
  const minutes = Math.floor(seconds / 60);
  const remainingSeconds = seconds % 60;

  if (minutes === 0) {
    return `${remainingSeconds}s`;
  }

  return remainingSeconds === 0 ? `${minutes}m` : `${minutes}m ${remainingSeconds}s`;
}

function formatRewards(rewards: PveRewards): string {
  const text = RESOURCE_KEYS.filter((resourceType) => rewards[resourceType] > 0)
    .map((resourceType) => `${rewards[resourceType]} ${resourceType}`)
    .join(' · ');
  return text || 'No resources';
}

export function PveCampDetailPanel({ campId, onClose }: { campId: string; onClose?: () => void }) {
  const queryClient = useQueryClient();
  const [quantities, setQuantities] = useState<ArmyUnits>(EMPTY_ARMY);
  const [isConfirmOpen, setConfirmOpen] = useState(false);

  const detailQuery = useQuery({
    queryKey: ['pve-camp-detail', campId],
    queryFn: () => getPveCampDetail(campId),
    retry: 1,
  });

  const attackMutation = useMutation({
    mutationFn: () =>
      attackPveCamp(campId, {
        originCityId: detailQuery.data?.originCity.id ?? '',
        units: quantities,
      }),
    onSuccess: () => {
      setConfirmOpen(false);
      setQuantities(EMPTY_ARMY);
      void queryClient.invalidateQueries({ queryKey: ['army-movements'] });
      void queryClient.invalidateQueries({ queryKey: ['pve-camp-detail', campId] });
      void queryClient.invalidateQueries({ queryKey: ['barracks'] });
      void queryClient.invalidateQueries({ queryKey: ['reports'] });
    },
  });

  if (detailQuery.isPending) {
    return <LoadingState message="Scouting the Barbarian Village..." />;
  }

  if (detailQuery.isError || !detailQuery.data) {
    return <ErrorState title="Unable to load village details." onRetry={() => void detailQuery.refetch()} />;
  }

  const detail = detailQuery.data;
  const camp = detail.camp;
  const getQuantity = (units: ArmyUnits, unitType: UnitType) => units[unitType] ?? 0;
  const totalSelected = detail.units.reduce(
    (sum, unit) => sum + getQuantity(quantities, unit.type),
    0,
  );
  const armyTotal = detail.units.reduce((sum, unit) => sum + getQuantity(detail.army, unit.type), 0);
  const hasEnoughUnits = detail.units.every(
    (unit) => getQuantity(quantities, unit.type) <= getQuantity(detail.army, unit.type),
  );
  const attackPower = detail.units.reduce(
    (sum, unit) => sum + getQuantity(quantities, unit.type) * unit.attack,
    0,
  );
  const canOpenConfirmation = totalSelected > 0 && hasEnoughUnits;

  const updateQuantity = (unitType: UnitType, value: number, max: number) => {
    const quantity = Math.max(0, Math.min(max, Math.floor(Number.isFinite(value) ? value : 0)));
    setQuantities((current) => ({ ...current, [unitType]: quantity }));
  };

  return (
    <Panel
      title={camp.name}
      subtitle={`Level ${camp.level} Barbarian Village · ${camp.island.name}`}
      action={
        <span className="flex items-center gap-2">
          <Badge variant={STRENGTH_BADGE_VARIANTS[camp.strengthLabel] ?? 'neutral'}>
            {camp.strengthLabel} threat
          </Badge>
          {onClose ? (
            <button
              type="button"
              aria-label="Close village details"
              onClick={onClose}
              className="flex h-7 w-7 items-center justify-center rounded-full text-muted transition-colors hover:bg-surface-strong hover:text-text focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
            >
              ✕
            </button>
          ) : null}
        </span>
      }
    >
      <div className="grid gap-3 rounded-md border border-border bg-surface/70 p-3 text-sm sm:grid-cols-2">
        <div>
          <p className="font-black text-muted">Enemy strength</p>
          <p className="font-bold text-text">{camp.enemyStrength}</p>
        </div>
        <div>
          <p className="font-black text-muted">Travel time</p>
          <p className="font-bold text-text">{formatTravelTime(camp.travelTimeSeconds)}</p>
        </div>
        <div>
          <p className="font-black text-muted">Possible rewards</p>
          <p className="font-bold text-text">{formatRewards(camp.rewards)}</p>
        </div>
        <div>
          <p className="font-black text-muted">Island</p>
          <p className="font-bold text-text">{camp.island.name}</p>
        </div>
        <div>
          <p className="font-black text-muted">Attacking from</p>
          <p className="font-bold text-text">{detail.originCity.name}</p>
        </div>
      </div>

      <div className="space-y-2">
        <h3 className="text-sm font-black text-text">Choose your army</h3>
        {armyTotal === 0 ? (
          <Alert variant="warning">
            You have no trained land units. Train troops in the Barracks first.
          </Alert>
        ) : (
          detail.units.map((unit) => (
            <div
              key={unit.type}
              className="flex items-center justify-between gap-3 rounded-md border border-border bg-surface/60 p-3"
            >
              <div>
                <p className="text-sm font-black text-text">{unit.name}</p>
                <p className="text-xs text-muted">
                  ATK {unit.attack} · Available: {getQuantity(detail.army, unit.type)}
                </p>
              </div>
              <input
                aria-label={`${unit.name} to send`}
                className="w-20 rounded-md border border-border bg-surface px-3 py-2 text-sm text-text"
                type="number"
                min={0}
                max={getQuantity(detail.army, unit.type)}
                value={getQuantity(quantities, unit.type)}
                onChange={(event) =>
                  updateQuantity(unit.type, Number(event.target.value), getQuantity(detail.army, unit.type))
                }
              />
            </div>
          ))
        )}
      </div>

      <div className="flex items-center justify-between rounded-md border border-border bg-surface/70 px-3 py-2 text-sm">
        <span className="font-bold text-muted">Your attack power</span>
        <span className={`font-black ${attackPower >= camp.enemyStrength ? 'text-success' : 'text-danger'}`}>
          {attackPower} vs {camp.enemyStrength}
        </span>
      </div>

      <Button
        variant="primary"
        className="w-full justify-center"
        disabled={!canOpenConfirmation || attackMutation.isPending}
        onClick={() => setConfirmOpen(true)}
      >
        Attack Village
      </Button>
      {attackMutation.isError ? <Alert variant="danger">{attackMutation.error.message}</Alert> : null}
      {attackMutation.isSuccess ? (
        <Alert variant="success">Your army is on its way to {camp.name}.</Alert>
      ) : null}

      <Modal isOpen={isConfirmOpen} onClose={() => setConfirmOpen(false)} title="Confirm attack">
        <div className="space-y-4">
          <div className="rounded-md border border-border bg-surface/70 p-3">
            <dl className="grid gap-2 text-sm">
              <div className="flex justify-between gap-4">
                <dt className="font-bold text-muted">Target</dt>
                <dd className="font-black text-text">
                  {camp.name} (Level {camp.level})
                </dd>
              </div>
              <div className="flex justify-between gap-4">
                <dt className="font-bold text-muted">Army</dt>
                <dd className="text-right font-black text-text">
                  {detail.units
                    .filter((unit) => getQuantity(quantities, unit.type) > 0)
                    .map((unit) => `${getQuantity(quantities, unit.type)} ${unit.name}`)
                    .join(', ') || 'No units selected'}
                </dd>
              </div>
              <div className="flex justify-between gap-4">
                <dt className="font-bold text-muted">Attack power</dt>
                <dd className={`font-black ${attackPower >= camp.enemyStrength ? 'text-success' : 'text-danger'}`}>
                  {attackPower} vs {camp.enemyStrength}
                </dd>
              </div>
              <div className="flex justify-between gap-4">
                <dt className="font-bold text-muted">Travel time</dt>
                <dd className="font-black text-text">
                  {formatTravelTime(camp.travelTimeSeconds)} each way
                </dd>
              </div>
            </dl>
          </div>
          {attackPower < camp.enemyStrength ? (
            <Alert variant="warning">
              Your army looks too weak for this village. Expect a defeat and heavy losses.
            </Alert>
          ) : null}
          {attackMutation.isError ? (
            <Alert variant="danger">{attackMutation.error.message}</Alert>
          ) : null}
          <div className="flex justify-end gap-2">
            <Button variant="ghost" onClick={() => setConfirmOpen(false)} disabled={attackMutation.isPending}>
              Cancel
            </Button>
            <Button onClick={() => attackMutation.mutate()} disabled={attackMutation.isPending}>
              {attackMutation.isPending ? 'Sending army...' : 'Confirm attack'}
            </Button>
          </div>
        </div>
      </Modal>
    </Panel>
  );
}
