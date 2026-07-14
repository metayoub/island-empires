import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { Badge } from '../../../components/ui/Badge';
import { Panel } from '../../../components/ui/Panel';
import { Skeleton } from '../../../components/ui/Skeleton';
import { Timer } from '../../../components/ui/Timer';
import { getBarracksOverview, getShipyardOverview } from '../../barracks/barracks.api';
import { getCityOverview, getMovements } from '../../city/city.api';
import { getActiveBlockades, getNavalMovements } from '../../map/naval.api';
import { getArmyMovements } from '../../map/pve.api';
import { getPvpMovements } from '../../map/pvp.api';
import { getResearchOverview } from '../../research/research.api';
import { getSpyMissions, getSpyOverview, SPY_MISSION_LABELS } from '../../scouting/scouting.api';
import { useAppStore } from '../../../stores/app.store';

export function ActiveTimersPanel() {
  const queryClient = useQueryClient();
  const selectedCityId = useAppStore((state) => state.selectedCityId);

  const cityOverviewQuery = useQuery({
    queryKey: ['city-overview', selectedCityId],
    queryFn: () => getCityOverview(selectedCityId ?? ''),
    enabled: Boolean(selectedCityId),
    retry: 1,
    refetchInterval: (query) => (query.state.data?.activeConstruction ? 5000 : false),
  });

  const researchQuery = useQuery({
    queryKey: ['research-overview'],
    queryFn: getResearchOverview,
    enabled: Boolean(selectedCityId),
    retry: 1,
    refetchInterval: (query) => (query.state.data?.activeResearch ? 5000 : false),
  });

  const barracksQuery = useQuery({
    queryKey: ['barracks', selectedCityId],
    queryFn: () => getBarracksOverview(selectedCityId ?? ''),
    enabled: Boolean(selectedCityId),
    retry: 1,
    refetchInterval: (query) => (query.state.data?.activeTraining ? 5000 : false),
  });

  const shipyardQuery = useQuery({
    queryKey: ['shipyard', selectedCityId],
    queryFn: () => getShipyardOverview(selectedCityId ?? ''),
    enabled: Boolean(selectedCityId),
    retry: 1,
    refetchInterval: (query) => (query.state.data?.activeTraining ? 5000 : false),
  });

  const spyQuery = useQuery({
    queryKey: ['spy-overview', selectedCityId],
    queryFn: () => getSpyOverview(selectedCityId ?? ''),
    enabled: Boolean(selectedCityId),
    retry: 1,
    refetchInterval: (query) => ((query.state.data?.trainingQueue.length ?? 0) > 0 ? 5000 : false),
  });

  const movementsQuery = useQuery({
    queryKey: ['movements'],
    queryFn: getMovements,
    enabled: Boolean(selectedCityId),
    retry: 1,
    refetchInterval: 5000,
  });

  const armyMovementsQuery = useQuery({
    queryKey: ['army-movements'],
    queryFn: getArmyMovements,
    enabled: Boolean(selectedCityId),
    retry: 1,
    refetchInterval: 5000,
  });

  const pvpMovementsQuery = useQuery({
    queryKey: ['pvp-movements'],
    queryFn: getPvpMovements,
    enabled: Boolean(selectedCityId),
    retry: 1,
    refetchInterval: 5000,
  });

  const navalMovementsQuery = useQuery({
    queryKey: ['naval-movements'],
    queryFn: getNavalMovements,
    enabled: Boolean(selectedCityId),
    retry: 1,
    refetchInterval: 5000,
  });

  const blockadesQuery = useQuery({
    queryKey: ['naval-blockades'],
    queryFn: getActiveBlockades,
    enabled: Boolean(selectedCityId),
    retry: 1,
    refetchInterval: 5000,
  });

  const spyMissionsQuery = useQuery({
    queryKey: ['spy-missions'],
    queryFn: getSpyMissions,
    enabled: Boolean(selectedCityId),
    retry: 1,
    refetchInterval: 5000,
  });

  if (!selectedCityId) {
    return null;
  }

  const construction = cityOverviewQuery.data?.activeConstruction ?? null;
  const research =
    researchQuery.data?.activeResearch ?? cityOverviewQuery.data?.research.activeResearch ?? null;
  const troopTraining = barracksQuery.data?.activeTraining ?? null;
  const fleetTraining = shipyardQuery.data?.activeTraining ?? null;
  const spyTraining = spyQuery.data?.trainingQueue ?? [];
  const activeMovements = (movementsQuery.data ?? []).filter(
    (movement) => isActiveMovementStatus(movement.status),
  );
  const activeArmyMovements = (armyMovementsQuery.data ?? []).filter((movement) =>
    isActiveMovementStatus(movement.status),
  );
  const activePvpMovements = (pvpMovementsQuery.data ?? []).filter((movement) =>
    isActiveMovementStatus(movement.status),
  );
  const activeNavalMovements = (navalMovementsQuery.data ?? []).filter((movement) =>
    isActiveMovementStatus(movement.status),
  );
  const activeBlockades = (blockadesQuery.data ?? []).filter((blockade) => blockade.status === 'active');
  const activeSpyMissions = (spyMissionsQuery.data?.missions ?? []).filter(
    (mission) => isActiveMovementStatus(mission.status) && Boolean(mission.arrivalTime),
  );
  const trainingCount =
    Number(Boolean(troopTraining)) + Number(Boolean(fleetTraining)) + spyTraining.length;
  const movementCount =
    activeMovements.length +
    activeArmyMovements.length +
    activePvpMovements.length +
    activeNavalMovements.length +
    activeBlockades.length +
    activeSpyMissions.length;
  const activeCount =
    Number(Boolean(construction)) +
    Number(Boolean(research)) +
    trainingCount +
    movementCount;
  const isLoadingTimers =
    activeCount === 0 &&
    (cityOverviewQuery.isPending ||
      researchQuery.isPending ||
      barracksQuery.isPending ||
      shipyardQuery.isPending ||
      spyQuery.isPending ||
      movementsQuery.isPending ||
      armyMovementsQuery.isPending ||
      pvpMovementsQuery.isPending ||
      navalMovementsQuery.isPending ||
      blockadesQuery.isPending ||
      spyMissionsQuery.isPending);

  const refreshTimers = () => {
    void queryClient.invalidateQueries({ queryKey: ['city-overview', selectedCityId] });
    void queryClient.invalidateQueries({ queryKey: ['research-overview'] });
    void queryClient.invalidateQueries({ queryKey: ['barracks', selectedCityId] });
    void queryClient.invalidateQueries({ queryKey: ['shipyard', selectedCityId] });
    void queryClient.invalidateQueries({ queryKey: ['spy-overview', selectedCityId] });
    void queryClient.invalidateQueries({ queryKey: ['movements'] });
    void queryClient.invalidateQueries({ queryKey: ['transport-options', selectedCityId] });
    void queryClient.invalidateQueries({ queryKey: ['reports'] });
    void queryClient.invalidateQueries({ queryKey: ['notifications'] });
    void queryClient.invalidateQueries({ queryKey: ['notifications', 'unread-count'] });
    void queryClient.invalidateQueries({ queryKey: ['army-movements'] });
    void queryClient.invalidateQueries({ queryKey: ['pvp-movements'] });
    void queryClient.invalidateQueries({ queryKey: ['naval-movements'] });
    void queryClient.invalidateQueries({ queryKey: ['naval-blockades'] });
    void queryClient.invalidateQueries({ queryKey: ['spy-missions'] });
  };

  return (
    <Panel
      title="Active Timers"
      action={activeCount > 0 ? <Badge variant="info">{activeCount} active</Badge> : undefined}
    >
      {isLoadingTimers ? <Skeleton className="h-20 w-full" /> : null}

      {activeCount > 0 ? (
        <div className="space-y-2">
          {construction ? (
            <TimerRow
              label="Building"
              title={`${construction.buildingName} Lv ${construction.toLevel}`}
              finishesAt={construction.finishesAt}
              onComplete={refreshTimers}
            />
          ) : null}
          {!construction ? (
            <IdleRow label="Building" title="No building upgrade active" to="/" action="Build" />
          ) : null}
          {troopTraining ? (
            <TimerRow
              label="Training"
              title={`${troopTraining.quantity} x ${troopTraining.unitName}`}
              finishesAt={troopTraining.finishesAt}
              onComplete={refreshTimers}
            />
          ) : null}
          {fleetTraining ? (
            <TimerRow
              label="Shipyard"
              title={`${fleetTraining.quantity} x ${fleetTraining.unitName}`}
              finishesAt={fleetTraining.finishesAt}
              onComplete={refreshTimers}
            />
          ) : null}
          {spyTraining.map((job) => (
            <TimerRow
              key={job.id}
              label="Spies"
              title={`${job.quantity} spies training`}
              finishesAt={job.finishesAt}
              onComplete={refreshTimers}
            />
          ))}
          {trainingCount === 0 ? (
            <IdleRow
              label="Training"
              title="No unit or spy training active"
              to="/overview"
              action="Train"
            />
          ) : null}
          {research ? (
            <TimerRow
              label="Research"
              title={research.technologyName}
              finishesAt={research.finishesAt}
              onComplete={refreshTimers}
            />
          ) : null}
          {!research ? (
            <IdleRow
              label="Research"
              title="No technology search active"
              to="/research"
              action="Start"
            />
          ) : null}
          {activeMovements.map((movement) => (
            <TimerRow
              key={movement.id}
              label="Transport"
              title={`${movement.originCity.name} to ${movement.destinationCity?.name ?? 'destination'}${
                movement.status === 'returning' ? ' returning' : ''
              }`}
              finishesAt={
                movement.status === 'returning'
                  ? (movement.returnArrivalTime ?? movement.arrivalTime)
                  : movement.arrivalTime
              }
              onComplete={refreshTimers}
            />
          ))}
          {activeArmyMovements.map((movement) => (
            <TimerRow
              key={movement.id}
              label="PvE Attack"
              title={`${movement.originCity.name} to ${movement.camp?.name ?? 'Barbarian Village'}${
                movement.status === 'returning' ? ' returning' : ''
              }`}
              finishesAt={
                movement.status === 'returning'
                  ? (movement.returnArrivalTime ?? movement.arrivalTime)
                  : movement.arrivalTime
              }
              onComplete={refreshTimers}
            />
          ))}
          {activePvpMovements.map((movement) => (
            <TimerRow
              key={movement.id}
              label="PvP Attack"
              title={`${movement.originCity.name} to ${movement.targetCity?.name ?? 'target city'}${
                movement.status === 'returning' ? ' returning' : ''
              }`}
              finishesAt={
                movement.status === 'returning'
                  ? (movement.returnArrivalTime ?? movement.arrivalTime)
                  : movement.arrivalTime
              }
              onComplete={refreshTimers}
            />
          ))}
          {activeNavalMovements.map((movement) => (
            <TimerRow
              key={movement.id}
              label="Naval"
              title={`${movement.originCity.name} to ${movement.targetCity.name}${
                movement.status === 'returning' ? ' returning' : ''
              }`}
              finishesAt={
                movement.status === 'returning'
                  ? (movement.returnArrivalTime ?? movement.arrivalTime)
                  : movement.arrivalTime
              }
              onComplete={refreshTimers}
            />
          ))}
          {activeBlockades.map((blockade) => (
            <TimerRow
              key={blockade.id}
              label="Blockade"
              title="Active naval blockade"
              finishesAt={blockade.endsAt}
              onComplete={refreshTimers}
            />
          ))}
          {activeSpyMissions.map((mission) => (
            <TimerRow
              key={mission.id}
              label="Scouting"
              title={`${mission.originCityName ?? 'Origin city'} to ${
                mission.targetCityName ?? 'target city'
              } - ${SPY_MISSION_LABELS[mission.missionType]}`}
              finishesAt={mission.arrivalTime ?? new Date().toISOString()}
              onComplete={refreshTimers}
            />
          ))}
          {movementCount === 0 ? (
            <IdleRow
              label="Movement"
              title="No transport, attack, naval, or scouting active"
              to="/map"
              action="Map"
            />
          ) : null}
        </div>
      ) : null}

      {!isLoadingTimers && activeCount === 0 ? (
        <div className="space-y-2">
          <IdleRow label="Building" title="No building upgrade active" to="/" action="Build" />
          <IdleRow
            label="Training"
            title="No unit or spy training active"
            to="/overview"
            action="Train"
          />
          <IdleRow label="Research" title="No technology search active" to="/research" action="Start" />
          <IdleRow label="Movement" title="No transport, attack, naval, or scouting active" to="/map" action="Map" />
        </div>
      ) : null}
    </Panel>
  );
}

function isActiveMovementStatus(status: string): boolean {
  return status === 'in_transit' || status === 'returning';
}

function TimerRow({
  label,
  title,
  finishesAt,
  onComplete,
}: {
  label: string;
  title: string;
  finishesAt: string;
  onComplete: () => void;
}) {
  return (
    <div className="rounded-md border border-border bg-surface/70 px-3 py-2">
      <div className="flex items-center justify-between gap-3">
        <span className="text-[11px] font-black uppercase tracking-wide text-muted">{label}</span>
        <Timer finishesAt={finishesAt} onComplete={onComplete} />
      </div>
      <p className="mt-1 truncate text-sm font-semibold text-text">{title}</p>
    </div>
  );
}

function IdleRow({
  label,
  title,
  to,
  action,
}: {
  label: string;
  title: string;
  to: string;
  action: string;
}) {
  return (
    <div className="rounded-md border border-border bg-surface/50 px-3 py-2">
      <div className="flex items-center justify-between gap-3">
        <span className="text-[11px] font-black uppercase tracking-wide text-muted">{label}</span>
        <Link
          to={to}
          className="rounded border border-border bg-surface px-2 py-0.5 text-[11px] font-black uppercase text-primary transition hover:border-primary/40 hover:bg-primary/10"
        >
          {action}
        </Link>
      </div>
      <p className="mt-1 truncate text-sm font-semibold text-muted">{title}</p>
    </div>
  );
}
