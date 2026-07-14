import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';
import type { NavalShips } from '@island-empires/shared-types';
import { Alert, Button, ErrorState, LoadingState, Modal } from '../../../components/ui';
import { attackCityBySea, getNavalAttackOptions } from '../naval.api';

const EMPTY_SHIPS: NavalShips = { light_ship: 0, ram_ship: 0, fire_ship: 0 };

function formatCooldown(cooldownEndsAt: string | null): string | null {
  if (!cooldownEndsAt) return null;
  const remainingSeconds = Math.max(0, Math.ceil((new Date(cooldownEndsAt).getTime() - Date.now()) / 1000));
  return `Cooldown ends in ${Math.ceil(remainingSeconds / 60)}m.`;
}

function getQuantity(ships: Partial<NavalShips>, shipType: keyof NavalShips): number {
  return ships[shipType] ?? 0;
}

export function NavalAttackModal({
  targetCityId,
  originCityId,
  onClose,
}: {
  targetCityId: string | null;
  originCityId?: string | null;
  onClose: () => void;
}) {
  const queryClient = useQueryClient();
  const [ships, setShips] = useState<NavalShips>(EMPTY_SHIPS);
  const [establishBlockade, setEstablishBlockade] = useState(false);
  const [isConfirmOpen, setConfirmOpen] = useState(false);
  const isOpen = Boolean(targetCityId);

  const optionsQuery = useQuery({
    queryKey: ['naval-attack-options', targetCityId, originCityId],
    queryFn: () => getNavalAttackOptions(targetCityId ?? '', originCityId),
    enabled: isOpen,
    retry: 1,
  });

  const attackMutation = useMutation({
    mutationFn: () =>
      attackCityBySea(targetCityId ?? '', {
        originCityId: optionsQuery.data?.originCity.id ?? '',
        ships,
        establishBlockade,
      }),
    onSuccess: () => {
      setConfirmOpen(false);
      setShips(EMPTY_SHIPS);
      setEstablishBlockade(false);
      void queryClient.invalidateQueries({ queryKey: ['naval-movements'] });
      void queryClient.invalidateQueries({ queryKey: ['naval-blockades'] });
      void queryClient.invalidateQueries({ queryKey: ['reports'] });
      void queryClient.invalidateQueries({ queryKey: ['shipyard'] });
    },
  });

  const updateQuantity = (shipType: keyof NavalShips, value: number, max: number) => {
    const quantity = Math.max(0, Math.min(max, Math.floor(Number.isFinite(value) ? value : 0)));
    setShips((current) => ({ ...current, [shipType]: quantity }));
  };

  const selectedShipCount = Object.values(ships).reduce((sum, quantity) => sum + quantity, 0);

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Naval Attack">
      {optionsQuery.isPending ? <LoadingState message="Loading fleet options..." /> : null}
      {optionsQuery.isError ? (
        <ErrorState title="Unable to load naval options." onRetry={() => void optionsQuery.refetch()} />
      ) : null}
      {optionsQuery.data ? (
        <div className="space-y-4">
          <div className="rounded-md border border-border bg-surface/70 p-3">
            <p className="text-xs font-black uppercase tracking-wide text-muted">Target Port</p>
            <h2 className="mt-1 text-xl font-black text-text">{optionsQuery.data.targetCity.name}</h2>
            <p className="text-sm font-bold text-muted">Governor: {optionsQuery.data.targetCity.playerName}</p>
          </div>

          {!optionsQuery.data.attack.canAttack ? (
            <Alert variant="warning">
              {optionsQuery.data.attack.disabledReason ?? 'This naval attack is unavailable.'}
              {formatCooldown(optionsQuery.data.attack.cooldownEndsAt)
                ? ` ${formatCooldown(optionsQuery.data.attack.cooldownEndsAt)}`
                : ''}
            </Alert>
          ) : null}

          <div className="space-y-2">
            <h3 className="text-sm font-black text-text">Choose your fleet</h3>
            {optionsQuery.data.ships.map((ship) => (
              <div key={ship.type} className="flex items-center justify-between gap-3 rounded-md border border-border bg-surface/60 p-3">
                <div>
                  <p className="text-sm font-black text-text">{ship.name}</p>
                  <p className="text-xs text-muted">
                    ATK {ship.attack} · DEF {ship.defense} · Available: {getQuantity(optionsQuery.data.fleet, ship.type as keyof NavalShips)}
                  </p>
                </div>
                <input
                  aria-label={`${ship.name} to send`}
                  className="w-20 rounded-md border border-border bg-surface px-3 py-2 text-sm text-text"
                  type="number"
                  min={0}
                  max={getQuantity(optionsQuery.data.fleet, ship.type as keyof NavalShips)}
                  value={getQuantity(ships, ship.type as keyof NavalShips)}
                  onChange={(event) =>
                    updateQuantity(
                      ship.type as keyof NavalShips,
                      Number(event.target.value),
                      getQuantity(optionsQuery.data.fleet, ship.type as keyof NavalShips),
                    )
                  }
                />
              </div>
            ))}
          </div>

          <label className="flex items-center gap-3 rounded-md border border-border bg-surface/70 p-3 text-sm font-bold text-text">
            <input
              type="checkbox"
              checked={establishBlockade}
              onChange={(event) => setEstablishBlockade(event.target.checked)}
            />
            Establish blockade after victory
          </label>

          <div className="grid gap-3 sm:grid-cols-2">
            <div className="rounded-md border border-border bg-surface/70 px-3 py-2 text-sm">
              <span className="font-bold text-muted">Attack power</span>
              <p className="font-black text-text">
                {optionsQuery.data.ships.reduce(
                  (sum, ship) => sum + getQuantity(ships, ship.type as keyof NavalShips) * ship.attack,
                  0,
                )}
              </p>
            </div>
            <div className="rounded-md border border-border bg-surface/70 px-3 py-2 text-sm">
              <span className="font-bold text-muted">Ships selected</span>
              <p className="font-black text-text">{selectedShipCount}</p>
            </div>
          </div>

          <Button
            className="w-full justify-center"
            disabled={!optionsQuery.data.attack.canAttack || selectedShipCount <= 0 || attackMutation.isPending}
            onClick={() => setConfirmOpen(true)}
          >
            Send Fleet
          </Button>
          {attackMutation.isError ? <Alert variant="danger">{attackMutation.error.message}</Alert> : null}
          {attackMutation.isSuccess ? <Alert variant="success">Your fleet is underway.</Alert> : null}

          <Modal isOpen={isConfirmOpen} onClose={() => setConfirmOpen(false)} title="Confirm naval attack">
            <div className="space-y-4">
              <Alert variant="warning">
                Naval attacks damage fleets only. A blockade blocks trade temporarily and does not damage the city.
              </Alert>
              <div className="rounded-md border border-border bg-surface/70 p-3 text-sm">
                <p className="font-bold text-muted">Target</p>
                <p className="font-black text-text">{optionsQuery.data.targetCity.name}</p>
                <p className="mt-3 font-bold text-muted">Fleet</p>
                <p className="font-black text-text">
                  {optionsQuery.data.ships
                    .filter((ship) => getQuantity(ships, ship.type as keyof NavalShips) > 0)
                    .map((ship) => `${getQuantity(ships, ship.type as keyof NavalShips)} ${ship.name}`)
                    .join(', ')}
                </p>
              </div>
              <div className="flex justify-end gap-2">
                <Button variant="ghost" onClick={() => setConfirmOpen(false)} disabled={attackMutation.isPending}>
                  Cancel
                </Button>
                <Button onClick={() => attackMutation.mutate()} disabled={attackMutation.isPending}>
                  {attackMutation.isPending ? 'Sending...' : 'Send Fleet'}
                </Button>
              </div>
            </div>
          </Modal>
        </div>
      ) : null}
    </Modal>
  );
}
