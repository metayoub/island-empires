import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';
import type { ArmyUnits, UnitType } from '@island-empires/shared-types';
import { Alert, Button, ErrorState, LoadingState, Modal } from '../../../components/ui';
import { attackPlayerCity, getPvpAttackOptions } from '../pvp.api';

const EMPTY_ARMY: ArmyUnits = {};

function formatTravelHint(cooldownEndsAt: string | null): string | null {
  if (!cooldownEndsAt) {
    return null;
  }
  const remainingSeconds = Math.max(0, Math.ceil((new Date(cooldownEndsAt).getTime() - Date.now()) / 1000));
  const minutes = Math.ceil(remainingSeconds / 60);
  return `Cooldown ends in ${minutes}m.`;
}

export function PvpAttackModal({
  targetCityId,
  originCityId,
  onClose,
}: {
  targetCityId: string | null;
  originCityId?: string | null;
  onClose: () => void;
}) {
  const queryClient = useQueryClient();
  const [quantities, setQuantities] = useState<ArmyUnits>(EMPTY_ARMY);
  const [isConfirmOpen, setConfirmOpen] = useState(false);
  const isOpen = Boolean(targetCityId);

  const detailQuery = useQuery({
    queryKey: ['pvp-attack-options', targetCityId, originCityId],
    queryFn: () => getPvpAttackOptions(targetCityId ?? '', originCityId),
    enabled: isOpen,
    retry: 1,
  });

  const attackMutation = useMutation({
    mutationFn: () =>
      attackPlayerCity(targetCityId ?? '', {
        originCityId: detailQuery.data?.originCity.id ?? '',
        units: quantities,
      }),
    onSuccess: () => {
      setConfirmOpen(false);
      setQuantities(EMPTY_ARMY);
      void queryClient.invalidateQueries({ queryKey: ['pvp-movements'] });
      void queryClient.invalidateQueries({ queryKey: ['army-movements'] });
      void queryClient.invalidateQueries({ queryKey: ['reports'] });
      void queryClient.invalidateQueries({ queryKey: ['barracks'] });
    },
  });

  const getQuantity = (units: ArmyUnits, unitType: UnitType) => units[unitType] ?? 0;
  const updateQuantity = (unitType: UnitType, value: number, max: number) => {
    const quantity = Math.max(0, Math.min(max, Math.floor(Number.isFinite(value) ? value : 0)));
    setQuantities((current) => ({ ...current, [unitType]: quantity }));
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Attack City">
      {detailQuery.isPending ? <LoadingState message="Loading attack options..." /> : null}
      {detailQuery.isError ? (
        <ErrorState title="Unable to load attack options." onRetry={() => void detailQuery.refetch()} />
      ) : null}
      {detailQuery.data ? (
        <div className="space-y-4">
          <div className="rounded-md border border-border bg-surface/70 p-3">
            <p className="text-xs font-black uppercase tracking-wide text-muted">Target</p>
            <h2 className="mt-1 text-xl font-black text-text">{detailQuery.data.targetCity.name}</h2>
            <p className="text-sm font-bold text-muted">
              Governor: {detailQuery.data.targetCity.playerName}
            </p>
          </div>

          {!detailQuery.data.attack.canAttack ? (
            <Alert variant="warning">
              {detailQuery.data.attack.disabledReason ?? 'This attack is unavailable.'}
              {formatTravelHint(detailQuery.data.attack.cooldownEndsAt)
                ? ` ${formatTravelHint(detailQuery.data.attack.cooldownEndsAt)}`
                : ''}
            </Alert>
          ) : null}

          <div className="space-y-2">
            <h3 className="text-sm font-black text-text">Choose your army</h3>
            {detailQuery.data.units.map((unit) => (
              <div key={unit.type} className="flex items-center justify-between gap-3 rounded-md border border-border bg-surface/60 p-3">
                <div>
                  <p className="text-sm font-black text-text">{unit.name}</p>
                  <p className="text-xs text-muted">
                    ATK {unit.attack} · Carry {unit.capacity ?? 0} · Available: {getQuantity(detailQuery.data.army, unit.type)}
                  </p>
                </div>
                <input
                  aria-label={`${unit.name} to send`}
                  className="w-20 rounded-md border border-border bg-surface px-3 py-2 text-sm text-text"
                  type="number"
                  min={0}
                  max={getQuantity(detailQuery.data.army, unit.type)}
                  value={getQuantity(quantities, unit.type)}
                  onChange={(event) =>
                    updateQuantity(unit.type, Number(event.target.value), getQuantity(detailQuery.data.army, unit.type))
                  }
                />
              </div>
            ))}
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            <div className="rounded-md border border-border bg-surface/70 px-3 py-2 text-sm">
              <span className="font-bold text-muted">Attack power</span>
              <p className="font-black text-text">
                {detailQuery.data.units.reduce((sum, unit) => sum + getQuantity(quantities, unit.type) * unit.attack, 0)}
              </p>
            </div>
            <div className="rounded-md border border-border bg-surface/70 px-3 py-2 text-sm">
              <span className="font-bold text-muted">Carry capacity</span>
              <p className="font-black text-text">
                {detailQuery.data.units.reduce((sum, unit) => sum + getQuantity(quantities, unit.type) * (unit.capacity ?? 0), 0)}
              </p>
            </div>
          </div>

          <Button
            className="w-full justify-center"
            disabled={
              !detailQuery.data.attack.canAttack ||
              detailQuery.data.units.reduce((sum, unit) => sum + getQuantity(quantities, unit.type), 0) <= 0 ||
              attackMutation.isPending
            }
            onClick={() => setConfirmOpen(true)}
          >
            Attack City
          </Button>
          {attackMutation.isError ? <Alert variant="danger">{attackMutation.error.message}</Alert> : null}
          {attackMutation.isSuccess ? <Alert variant="success">Your army is on its way.</Alert> : null}

          <Modal isOpen={isConfirmOpen} onClose={() => setConfirmOpen(false)} title="Confirm attack">
            <div className="space-y-4">
              <Alert variant="warning">
                Cities, buildings, research, and population cannot be destroyed. Loot is capped and warehouse-protected.
              </Alert>
              <div className="rounded-md border border-border bg-surface/70 p-3 text-sm">
                <p className="font-bold text-muted">Target</p>
                <p className="font-black text-text">{detailQuery.data.targetCity.name}</p>
                <p className="mt-3 font-bold text-muted">Army</p>
                <p className="font-black text-text">
                  {detailQuery.data.units
                    .filter((unit) => getQuantity(quantities, unit.type) > 0)
                    .map((unit) => `${getQuantity(quantities, unit.type)} ${unit.name}`)
                    .join(', ')}
                </p>
              </div>
              <div className="flex justify-end gap-2">
                <Button variant="ghost" onClick={() => setConfirmOpen(false)} disabled={attackMutation.isPending}>
                  Cancel
                </Button>
                <Button onClick={() => attackMutation.mutate()} disabled={attackMutation.isPending}>
                  {attackMutation.isPending ? 'Sending...' : 'Send Attack'}
                </Button>
              </div>
            </div>
          </Modal>
        </div>
      ) : null}
    </Modal>
  );
}
