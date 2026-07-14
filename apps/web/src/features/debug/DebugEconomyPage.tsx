import { useQuery } from '@tanstack/react-query';
import type { ReactNode } from 'react';
import { getDebugEconomyDashboard } from './debugEconomy.api';

const RESOURCE_KEYS = ['wood', 'gold', 'marble', 'wine', 'crystal', 'sulfur'] as const;

export function DebugEconomyPage() {
  const query = useQuery({
    queryKey: ['debug-economy'],
    queryFn: getDebugEconomyDashboard,
    enabled: import.meta.env.DEV,
    refetchInterval: 10000,
  });

  if (!import.meta.env.DEV) {
    return <p className="text-sm font-semibold text-muted">Debug economy is only available in development.</p>;
  }

  if (query.isLoading) {
    return <p className="text-sm font-semibold text-muted">Loading economy dashboard...</p>;
  }

  if (query.isError || !query.data) {
    return <p className="text-sm font-semibold text-danger">Unable to load debug economy data.</p>;
  }

  const data = query.data;

  return (
    <div className="space-y-6">
      <header>
        <p className="text-xs font-black uppercase tracking-[0.18em] text-muted">Debug</p>
        <h1 className="text-3xl font-black text-text">Economy Dashboard</h1>
        <p className="mt-2 text-sm text-muted">
          {data.player.name} · {data.city.name} · account age {data.player.accountAgeHours}h
        </p>
      </header>

      <section className="grid gap-4 xl:grid-cols-3">
        <Panel title="Resources">
          <div className="grid grid-cols-2 gap-3">
            {RESOURCE_KEYS.map((resourceType) => (
              <Metric
                key={resourceType}
                label={resourceType}
                value={data.resources[resourceType]}
                sub={`+${data.production[`${resourceType}PerHour` as keyof typeof data.production]}/h`}
              />
            ))}
          </div>
        </Panel>
        <Panel title="Research">
          <Metric label="points" value={data.research.researchPoints} sub={`+${data.research.researchPointsPerHour}/h`} />
          <p className="mt-3 text-sm text-muted">
            Active: {data.research.activeResearch?.technologyName ?? 'none'}
          </p>
        </Panel>
        <Panel title="Next Action">
          <p className="text-base font-bold text-text">{data.estimatedNextMeaningfulAction}</p>
          <p className="mt-3 text-sm text-muted">
            Storage: {data.storage.capacityPerResource} per resource
          </p>
        </Panel>
      </section>

      <Panel title="Progression Blockers">
        <div className="space-y-3">
          {data.progressionBlockers.length === 0 ? (
            <p className="text-sm font-semibold text-muted">No current blockers detected.</p>
          ) : (
            data.progressionBlockers.map((blocker) => (
              <div key={blocker.id} className="rounded-lg border border-border bg-surface/60 p-3">
                <p className="text-sm font-black text-text">{blocker.title}</p>
                <p className="mt-1 text-sm text-muted">{blocker.description}</p>
                <p className="mt-2 text-xs font-bold uppercase text-primary">{blocker.recommendation}</p>
              </div>
            ))
          )}
        </div>
      </Panel>

      <section className="grid gap-4 xl:grid-cols-2">
        <Panel title="Buildings">
          <div className="max-h-[420px] overflow-auto">
            <table className="w-full text-left text-sm">
              <thead className="text-xs uppercase text-muted">
                <tr>
                  <th className="py-2">Building</th>
                  <th>Lv</th>
                  <th>Cost</th>
                  <th>Time</th>
                </tr>
              </thead>
              <tbody>
                {data.buildings.map((building) => (
                  <tr key={building.type} className="border-t border-border">
                    <td className="py-2 font-bold text-text">{building.name}</td>
                    <td>{building.level}</td>
                    <td>{formatCost(building.upgradeCost)}</td>
                    <td>{building.upgradeDurationSeconds}s</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Panel>
        <Panel title="Units">
          <div className="grid gap-2 sm:grid-cols-2">
            {data.units.slice(0, 8).map((unit) => (
              <div key={unit.type} className="rounded-lg border border-border bg-surface/60 p-3">
                <p className="font-black text-text">
                  {unit.name} <span className="text-muted">x{unit.owned}</span>
                </p>
                <p className="text-xs text-muted">
                  Cost {formatCost(unit.cost)} · {unit.trainingSecondsPerUnit}s
                </p>
              </div>
            ))}
          </div>
        </Panel>
      </section>

      <section className="grid gap-4 xl:grid-cols-2">
        <Panel title="PvE Rewards">
          <div className="grid gap-2 sm:grid-cols-3">
            {data.pveCampRewards.map((camp) => (
              <Metric
                key={camp.level}
                label={`Level ${camp.level}`}
                value={`${camp.rewards.wood}w/${camp.rewards.gold}g`}
                sub={`Power ${camp.enemyStrength}`}
              />
            ))}
          </div>
        </Panel>
        <Panel title="Analytics">
          <div className="grid gap-2 sm:grid-cols-2">
            {data.analytics.map((event) => (
              <Metric key={event.eventType} label={event.eventType} value={event.count} />
            ))}
          </div>
        </Panel>
      </section>
    </div>
  );
}

function Panel({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="rounded-lg border border-border bg-panel p-4 shadow-sm">
      <h2 className="mb-3 text-lg font-black text-text">{title}</h2>
      {children}
    </section>
  );
}

function Metric({ label, value, sub }: { label: string; value: number | string; sub?: string }) {
  return (
    <div className="rounded-lg border border-border bg-surface/70 p-3">
      <p className="text-xs font-bold uppercase text-muted">{label}</p>
      <p className="mt-1 text-xl font-black text-text">{value}</p>
      {sub ? <p className="mt-1 text-xs text-muted">{sub}</p> : null}
    </div>
  );
}

function formatCost(cost: Partial<Record<(typeof RESOURCE_KEYS)[number], number>>) {
  const parts = RESOURCE_KEYS.filter((resourceType) => (cost[resourceType] ?? 0) > 0).map(
    (resourceType) => `${cost[resourceType]} ${resourceType}`,
  );

  return parts.length > 0 ? parts.join(', ') : 'free';
}
