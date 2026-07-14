import { useEffect, useMemo, useState } from 'react';
import type { CitySummary, MovementSummary, ResourceBalance } from '@island-empires/shared-types';
import { Button } from '../../../components/ui/Button';
import { Panel } from '../../../components/ui/Panel';
import { Timer } from '../../../components/ui/Timer';

const RESOURCE_KEYS: Array<keyof ResourceBalance> = [
  'wood',
  'gold',
  'marble',
  'wine',
  'crystal',
  'sulfur',
];

type TransportPanelProps = {
  selectedCityId: string;
  cities: CitySummary[];
  movements: MovementSummary[];
  isSending: boolean;
  onSend: (input: { destinationCityId: string; resources: ResourceBalance }) => void;
  onTimerComplete: () => void;
};

export function TransportPanel({
  selectedCityId,
  cities,
  movements,
  isSending,
  onSend,
  onTimerComplete,
}: TransportPanelProps) {
  const destinationCities = useMemo(
    () => cities.filter((city) => city.id !== selectedCityId),
    [cities, selectedCityId],
  );
  const [destinationCityId, setDestinationCityId] = useState(destinationCities[0]?.id ?? '');
  const [resources, setResources] = useState<ResourceBalance>({
    wood: 0,
    gold: 0,
    marble: 0,
    wine: 0,
    crystal: 0,
    sulfur: 0,
  });
  const activeMovements = movements.filter((movement) => ['in_transit', 'returning'].includes(movement.status));
  const completedMovements = movements
    .filter((movement) => ['completed', 'cancelled'].includes(movement.status))
    .slice(0, 5);

  useEffect(() => {
    if (!destinationCityId && destinationCities[0]) {
      setDestinationCityId(destinationCities[0].id);
    }
  }, [destinationCities, destinationCityId]);

  function updateResource(resourceType: keyof ResourceBalance, value: string) {
    setResources((current) => ({
      ...current,
      [resourceType]: Math.max(0, Math.floor(Number(value) || 0)),
    }));
  }

  return (
    <Panel title="Resource Transport">
      {destinationCities.length === 0 ? (
        <p className="text-sm text-muted">Found a second city to move resources between cities.</p>
      ) : (
        <div className="space-y-4">
          <label className="block text-sm font-bold text-text">
            Destination
            <select
              className="mt-2 w-full rounded-md border border-border bg-surface px-3 py-2 text-sm"
              value={destinationCityId}
              onChange={(event) => setDestinationCityId(event.target.value)}
            >
              {destinationCities.map((city) => (
                <option key={city.id} value={city.id}>
                  {city.name}
                  {city.island ? ` · ${city.island.name}` : ''}
                </option>
              ))}
            </select>
          </label>
          <div className="grid gap-3 sm:grid-cols-3">
            {RESOURCE_KEYS.map((resourceType) => (
              <label key={resourceType} className="block text-xs font-bold uppercase text-muted">
                {resourceType}
                <input
                  className="mt-1 w-full rounded-md border border-border bg-surface px-3 py-2 text-sm text-text"
                  min={0}
                  type="number"
                  value={resources[resourceType]}
                  onChange={(event) => updateResource(resourceType, event.target.value)}
                />
              </label>
            ))}
          </div>
          <Button
            disabled={isSending || !destinationCityId}
            onClick={() => onSend({ destinationCityId, resources })}
          >
            {isSending ? 'Sending...' : 'Send resources'}
          </Button>
        </div>
      )}

      {activeMovements.length > 0 ? (
        <div className="mt-5 space-y-3">
          <h3 className="text-sm font-black uppercase tracking-wide text-muted">Active movements</h3>
          {activeMovements.map((movement) => (
            <div key={movement.id} className="rounded-md border border-border bg-surface/60 p-3">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <p className="font-bold text-text">
                  {movement.originCity.name} to {movement.destinationCity?.name ?? 'destination'}
                </p>
                <span className="rounded-full bg-primary/10 px-2 py-1 text-xs font-bold uppercase text-primary">
                  {movement.status === 'returning' ? 'Returning' : 'In transit'}
                </span>
              </div>
              <p className="mt-2 text-sm text-muted">
                {formatPayload(movement.payload?.resources ?? null)}
              </p>
              <div className="mt-2 text-sm">
                <Timer
                  finishesAt={
                    movement.status === 'returning'
                      ? (movement.returnArrivalTime ?? movement.arrivalTime)
                      : movement.arrivalTime
                  }
                  onComplete={onTimerComplete}
                />
              </div>
            </div>
          ))}
        </div>
      ) : null}

      {completedMovements.length > 0 ? (
        <div className="mt-5 space-y-3">
          <h3 className="text-sm font-black uppercase tracking-wide text-muted">Transport history</h3>
          {completedMovements.map((movement) => (
            <div key={movement.id} className="rounded-md border border-border bg-surface/40 p-3">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <p className="font-bold text-text">
                  {movement.originCity.name} to {movement.destinationCity?.name ?? 'destination'}
                </p>
                <span className="rounded-full bg-success/10 px-2 py-1 text-xs font-bold uppercase text-success">
                  {movement.status === 'cancelled' ? 'Cancelled' : 'Completed'}
                </span>
              </div>
              <p className="mt-2 text-sm text-muted">{formatPayload(movement.payload?.resources ?? null)}</p>
            </div>
          ))}
        </div>
      ) : null}
    </Panel>
  );
}

function formatPayload(payload: ResourceBalance | null): string {
  if (!payload) return 'No resources';
  const entries = RESOURCE_KEYS.filter((resourceType) => payload[resourceType] > 0).map(
    (resourceType) => `${payload[resourceType]} ${resourceType}`,
  );

  return entries.length > 0 ? entries.join(', ') : 'No resources';
}
