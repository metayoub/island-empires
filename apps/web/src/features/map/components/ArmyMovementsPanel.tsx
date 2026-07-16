import { useQuery, useQueryClient } from '@tanstack/react-query';
import type {
  ArmyMovementSummary,
  ArmyUnits,
  CityBlockadeSummary,
  NavalMovementSummary,
  NavalShips,
  PveRewards,
  PvpMovementSummary,
} from '@island-empires/shared-types';
import { Badge, EmptyState, Panel, Timer } from '../../../components/ui';
import { getActiveBlockades, getNavalMovements } from '../naval.api';
import { getArmyMovements } from '../pve.api';
import { getPvpMovements } from '../pvp.api';

const UNIT_LABELS: Array<{ key: keyof ArmyUnits; label: string }> = [
  { key: 'militia', label: 'Militia' },
  { key: 'spearman', label: 'Spearman' },
  { key: 'archer', label: 'Archer' },
  { key: 'swordsman', label: 'Swordsman' },
  { key: 'cavalry', label: 'Cavalry' },
  { key: 'catapult', label: 'Catapult' },
];
const RESOURCE_KEYS: Array<keyof PveRewards> = ['wood', 'gold', 'marble', 'sulfur', 'crystal', 'wine'];

function formatUnits(units: ArmyUnits): string {
  const parts = UNIT_LABELS.filter(({ key }) => (units[key] ?? 0) > 0).map(
    ({ key, label }) => `${units[key] ?? 0} ${label}`,
  );

  return parts.length > 0 ? parts.join(', ') : 'No units';
}

function formatRewards(rewards: PveRewards): string {
  const parts = RESOURCE_KEYS.filter((resourceType) => rewards[resourceType] > 0).map(
    (resourceType) => `${rewards[resourceType]} ${resourceType}`,
  );
  return parts.length > 0 ? parts.join(', ') : 'No resources';
}

const SHIP_LABELS: Array<{ key: keyof NavalShips; label: string }> = [
  { key: 'light_ship', label: 'Light Ship' },
  { key: 'ram_ship', label: 'Ram Ship' },
  { key: 'fire_ship', label: 'Fire Ship' },
];

function formatShips(ships: NavalShips): string {
  const parts = SHIP_LABELS.filter(({ key }) => (ships[key] ?? 0) > 0).map(
    ({ key, label }) => `${ships[key] ?? 0} ${label}`,
  );

  return parts.length > 0 ? parts.join(', ') : 'No ships';
}

function getStatusLabel(movement: ArmyMovementSummary): string {
  if (movement.status === 'in_transit') {
    return 'Marching to village';
  }
  if (movement.status === 'returning') {
    return 'Returning home';
  }

  return 'Completed';
}

function getPvpStatusLabel(movement: PvpMovementSummary): string {
  if (movement.status === 'in_transit') {
    return 'Marching to city';
  }
  if (movement.status === 'returning') {
    return 'Returning home';
  }

  return 'Completed';
}

function getNavalStatusLabel(movement: NavalMovementSummary): string {
  if (movement.status === 'in_transit') {
    return 'Sailing to port';
  }
  if (movement.status === 'returning') {
    return 'Returning home';
  }

  return movement.blockadeId ? 'Blockading' : 'Completed';
}

function BattleOutcome({ movement }: { movement: ArmyMovementSummary }) {
  if (!movement.battle) {
    return null;
  }

  const { battle } = movement;
  const lostText = formatUnits(battle.unitsLost);

  return (
    <div className="mt-2 rounded-md border border-border bg-surface/70 p-2 text-xs">
      <div className="flex items-center gap-2">
        <Badge variant={battle.victory ? 'success' : 'danger'}>
          {battle.victory ? 'Victory' : 'Defeat'}
        </Badge>
        <span className="font-semibold text-muted">
          Power {battle.playerPower} vs {battle.campPower}
        </span>
      </div>
      <p className="mt-1 text-muted">
        Losses: {lostText === 'No units' ? 'none' : lostText}
        {battle.victory ? ` · Loot: ${formatRewards(battle.rewards)}` : ''}
      </p>
    </div>
  );
}

export function ArmyMovementsPanel() {
  const queryClient = useQueryClient();

  const movementsQuery = useQuery({
    queryKey: ['army-movements'],
    queryFn: getArmyMovements,
    retry: 1,
    refetchInterval: 5000,
  });
  const pvpMovementsQuery = useQuery({
    queryKey: ['pvp-movements'],
    queryFn: getPvpMovements,
    retry: 1,
    refetchInterval: 5000,
  });
  const navalMovementsQuery = useQuery({
    queryKey: ['naval-movements'],
    queryFn: getNavalMovements,
    retry: 1,
    refetchInterval: 5000,
  });
  const blockadesQuery = useQuery({
    queryKey: ['naval-blockades'],
    queryFn: getActiveBlockades,
    retry: 1,
    refetchInterval: 5000,
  });

  const movements = movementsQuery.data ?? [];
  const pvpMovements = pvpMovementsQuery.data ?? [];
  const navalMovements = navalMovementsQuery.data ?? [];
  const blockades = blockadesQuery.data ?? [];
  const activeMovements = movements.filter((movement) =>
    ['in_transit', 'returning'].includes(movement.status),
  );
  const activePvpMovements = pvpMovements.filter((movement) =>
    ['in_transit', 'returning'].includes(movement.status),
  );
  const activeNavalMovements = navalMovements.filter((movement) =>
    ['in_transit', 'returning'].includes(movement.status),
  );
  const activeBlockades = blockades.filter((blockade) => blockade.status === 'active');
  const recentBattles = movements
    .filter((movement) => movement.status === 'completed' && movement.battle)
    .slice(0, 3);
  const recentPvpBattles = pvpMovements
    .filter((movement) => movement.status === 'completed' && movement.battle)
    .slice(0, 3);
  const recentNavalBattles = navalMovements
    .filter((movement) => movement.status === 'completed' && movement.battle)
    .slice(0, 3);

  const refresh = () => {
    void queryClient.invalidateQueries({ queryKey: ['army-movements'] });
    void queryClient.invalidateQueries({ queryKey: ['pvp-movements'] });
    void queryClient.invalidateQueries({ queryKey: ['naval-movements'] });
    void queryClient.invalidateQueries({ queryKey: ['naval-blockades'] });
    void queryClient.invalidateQueries({ queryKey: ['reports'] });
    void queryClient.invalidateQueries({ queryKey: ['barracks'] });
  };

  return (
    <Panel title="Army and Fleet Movements" subtitle="Village attacks, city raids, fleets, and blockades">
      {activeMovements.length === 0 &&
      activePvpMovements.length === 0 &&
      activeNavalMovements.length === 0 &&
      activeBlockades.length === 0 &&
      recentBattles.length === 0 &&
      recentPvpBattles.length === 0 &&
      recentNavalBattles.length === 0 ? (
        <EmptyState
          title="No active movements"
          description="Send an army or fleet to see it here."
        />
      ) : (
        <div className="space-y-3">
          {activeBlockades.map((blockade: CityBlockadeSummary) => (
            <div key={blockade.id} className="rounded-md border border-warning/30 bg-warning/10 p-3">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <p className="text-sm font-bold text-text">
                  Blockade on target city
                </p>
                <div className="flex flex-wrap items-center gap-3">
                  <span className="rounded-full bg-warning/10 px-2 py-1 text-xs font-bold uppercase text-warning">
                    Active blockade
                  </span>
                  <Timer finishesAt={blockade.endsAt} onComplete={refresh} />
                </div>
              </div>
              <p className="mt-1 text-xs text-muted">{formatShips(blockade.committedShips)}</p>
            </div>
          ))}
          {activeNavalMovements.map((movement) => (
            <div key={movement.id} className="rounded-md border border-secondary/30 bg-secondary/10 p-3">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <p className="text-sm font-bold text-text">
                  {movement.originCity.name} → {movement.targetCity.name}
                </p>
                <div className="flex flex-wrap items-center gap-3">
                  <span className="rounded-full bg-secondary/10 px-2 py-1 text-xs font-bold uppercase text-secondary">
                    {getNavalStatusLabel(movement)}
                  </span>
                  <Timer
                    finishesAt={
                      movement.status === 'returning'
                        ? movement.returnArrivalTime ?? movement.arrivalTime
                        : movement.arrivalTime
                    }
                    onComplete={refresh}
                  />
                </div>
              </div>
              <p className="mt-1 text-xs text-muted">{formatShips(movement.ships)}</p>
            </div>
          ))}
          {activePvpMovements.map((movement) => (
            <div key={movement.id} className="rounded-md border border-danger/30 bg-danger/10 p-3">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <p className="text-sm font-bold text-text">
                  {movement.originCity.name} → {movement.targetCity?.name ?? 'Target city'}
                </p>
                <div className="flex flex-wrap items-center gap-3">
                  <span className="rounded-full bg-danger/10 px-2 py-1 text-xs font-bold uppercase text-danger">
                    {getPvpStatusLabel(movement)}
                  </span>
                  <Timer
                    finishesAt={
                      movement.status === 'returning'
                        ? movement.returnArrivalTime ?? movement.arrivalTime
                        : movement.arrivalTime
                    }
                    onComplete={refresh}
                  />
                </div>
              </div>
              <p className="mt-1 text-xs text-muted">{formatUnits(movement.units)}</p>
              {movement.battle ? (
                <div className="mt-2 rounded-md border border-border bg-surface/70 p-2 text-xs">
                  <div className="flex items-center gap-2">
                    <Badge variant={movement.battle.attackerVictory ? 'success' : 'danger'}>
                      {movement.battle.attackerVictory ? 'Victory' : 'Defeat'}
                    </Badge>
                    <span className="font-semibold text-muted">
                      Power {movement.battle.attackerPower} vs {movement.battle.defenderPower}
                    </span>
                  </div>
                  <p className="mt-1 text-muted">
                    Loot: {movement.loot.wood} wood, {movement.loot.gold} gold
                  </p>
                </div>
              ) : null}
            </div>
          ))}
          {activeMovements.map((movement) => (
            <div key={movement.id} className="rounded-md border border-border bg-surface/60 p-3">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <p className="text-sm font-bold text-text">
                  {movement.originCity.name} → {movement.camp?.name ?? 'Barbarian Village'}
                </p>
                <div className="flex flex-wrap items-center gap-3">
                  <span className="rounded-full bg-primary/10 px-2 py-1 text-xs font-bold uppercase text-primary">
                    {getStatusLabel(movement)}
                  </span>
                  <Timer
                    finishesAt={
                      movement.status === 'returning'
                        ? movement.returnArrivalTime ?? movement.arrivalTime
                        : movement.arrivalTime
                    }
                    onComplete={refresh}
                  />
                </div>
              </div>
              <p className="mt-1 text-xs text-muted">{formatUnits(movement.units)}</p>
              <BattleOutcome movement={movement} />
            </div>
          ))}
          {recentBattles.length > 0 ? (
            <div>
              <p className="mb-2 text-[11px] font-black uppercase tracking-wide text-muted">
                Recent battles
              </p>
              <div className="space-y-2">
                {recentBattles.map((movement) => (
                  <div key={movement.id} className="rounded-md border border-border bg-surface/60 p-3">
                    <p className="text-sm font-bold text-text">
                      {movement.originCity.name} → {movement.camp?.name ?? 'Barbarian Village'}
                    </p>
                    <BattleOutcome movement={movement} />
                  </div>
                ))}
              </div>
            </div>
          ) : null}
          {recentPvpBattles.length > 0 ? (
            <div>
              <p className="mb-2 text-[11px] font-black uppercase tracking-wide text-muted">
                Recent city raids
              </p>
              <div className="space-y-2">
                {recentPvpBattles.map((movement) => (
                  <div key={movement.id} className="rounded-md border border-border bg-surface/60 p-3">
                    <p className="text-sm font-bold text-text">
                      {movement.originCity.name} → {movement.targetCity?.name ?? 'Target city'}
                    </p>
                    {movement.battle ? (
                      <p className="mt-1 text-xs text-muted">
                        {movement.battle.attackerVictory ? 'Victory' : 'Defeat'} · Loot: {movement.loot.wood} wood, {movement.loot.gold} gold
                      </p>
                    ) : null}
                  </div>
                ))}
              </div>
            </div>
          ) : null}
          {recentNavalBattles.length > 0 ? (
            <div>
              <p className="mb-2 text-[11px] font-black uppercase tracking-wide text-muted">
                Recent naval battles
              </p>
              <div className="space-y-2">
                {recentNavalBattles.map((movement) => (
                  <div key={movement.id} className="rounded-md border border-border bg-surface/60 p-3">
                    <p className="text-sm font-bold text-text">
                      {movement.originCity.name} → {movement.targetCity.name}
                    </p>
                    {movement.battle ? (
                      <p className="mt-1 text-xs text-muted">
                        {movement.battle.attackerVictory ? 'Victory' : 'Defeat'} · Losses:{' '}
                        {formatShips(movement.battle.attackerShipsLost)} · Loot: {formatRewards(movement.loot)}
                      </p>
                    ) : null}
                  </div>
                ))}
              </div>
            </div>
          ) : null}
        </div>
      )}
    </Panel>
  );
}
