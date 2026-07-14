import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useEffect, useMemo, useState } from 'react';
import type { ResourceBalance } from '@island-empires/shared-types';
import { Alert } from '../../components/ui/Alert';
import { Button } from '../../components/ui/Button';
import { ErrorState } from '../../components/ui/ErrorState';
import { LoadingState } from '../../components/ui/LoadingState';
import { Panel } from '../../components/ui/Panel';
import { Timer } from '../../components/ui/Timer';
import { useAppStore } from '../../stores/app.store';
import {
  getCities,
  getMovements,
  getTransportOptions,
  cancelTransport,
  startTransport,
} from '../city/city.api';

const RESOURCE_KEYS: Array<keyof ResourceBalance> = [
  'wood',
  'gold',
  'marble',
  'wine',
  'crystal',
  'sulfur',
];

const EMPTY_RESOURCES: ResourceBalance = {
  wood: 0,
  gold: 0,
  marble: 0,
  wine: 0,
  crystal: 0,
  sulfur: 0,
};

export function TransportPage() {
  const queryClient = useQueryClient();
  const selectedCityId = useAppStore((state) => state.selectedCityId);
  const setSelectedCityId = useAppStore((state) => state.setSelectedCityId);
  const [originCityId, setOriginCityId] = useState(selectedCityId ?? '');
  const [destinationCityId, setDestinationCityId] = useState('');
  const [resources, setResources] = useState<ResourceBalance>(EMPTY_RESOURCES);

  const citiesQuery = useQuery({ queryKey: ['cities'], queryFn: getCities, retry: 1 });
  const movementsQuery = useQuery({
    queryKey: ['movements'],
    queryFn: getMovements,
    retry: 1,
    refetchInterval: 5000,
  });
  const optionsQuery = useQuery({
    queryKey: ['transport-options', originCityId],
    queryFn: () => getTransportOptions(originCityId),
    enabled: Boolean(originCityId),
    retry: 1,
  });

  useEffect(() => {
    if (!originCityId && citiesQuery.data?.[0]) {
      setOriginCityId(citiesQuery.data[0].id);
    }
  }, [citiesQuery.data, originCityId]);

  useEffect(() => {
    const firstDestination = optionsQuery.data?.destinations[0]?.cityId ?? '';
    if (!destinationCityId || !optionsQuery.data?.destinations.some((city) => city.cityId === destinationCityId)) {
      setDestinationCityId(firstDestination);
    }
  }, [destinationCityId, optionsQuery.data]);

  const selectedDestination = optionsQuery.data?.destinations.find(
    (destination) => destination.cityId === destinationCityId,
  );
  const load = RESOURCE_KEYS.reduce((sum, resourceType) => sum + resources[resourceType], 0);
  const capacity = optionsQuery.data?.capacity ?? 0;
  const hasEnoughResources = RESOURCE_KEYS.every(
    (resourceType) => (optionsQuery.data?.resources[resourceType] ?? 0) >= resources[resourceType],
  );
  const activeMovements = useMemo(
    () => (movementsQuery.data ?? []).filter((movement) => ['in_transit', 'returning'].includes(movement.status)),
    [movementsQuery.data],
  );

  const startMutation = useMutation({
    mutationFn: () =>
      startTransport({
        originCityId,
        destinationCityId,
        resources,
      }),
    onSuccess: () => {
      setResources(EMPTY_RESOURCES);
      void queryClient.invalidateQueries({ queryKey: ['transport-options', originCityId] });
      void queryClient.invalidateQueries({ queryKey: ['movements'] });
      void queryClient.invalidateQueries({ queryKey: ['city-overview', originCityId] });
      void queryClient.invalidateQueries({ queryKey: ['reports'] });
      void queryClient.invalidateQueries({ queryKey: ['quest-overview'] });
      void queryClient.invalidateQueries({ queryKey: ['next-action'] });
    },
  });

  const cancelMutation = useMutation({
    mutationFn: (movementId: string) => cancelTransport(movementId),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['transport-options', originCityId] });
      void queryClient.invalidateQueries({ queryKey: ['movements'] });
      void queryClient.invalidateQueries({ queryKey: ['city-overview', originCityId] });
      void queryClient.invalidateQueries({ queryKey: ['reports'] });
    },
  });

  function updateOrigin(cityId: string) {
    setOriginCityId(cityId);
    setSelectedCityId(cityId);
    setResources(EMPTY_RESOURCES);
  }

  function updateResource(resourceType: keyof ResourceBalance, value: number) {
    setResources((current) => ({
      ...current,
      [resourceType]: Math.max(0, Math.floor(value || 0)),
    }));
  }

  function fillResource(resourceType: keyof ResourceBalance, percent: number) {
    const available = optionsQuery.data?.resources[resourceType] ?? 0;
    const remainingCapacity = Math.max(0, capacity - (load - resources[resourceType]));
    updateResource(resourceType, Math.min(Math.floor(available * percent), remainingCapacity));
  }

  const disabledReason =
    !optionsQuery.data ? 'Loading transport options.' :
    optionsQuery.data.originPortLevel < 1 ? 'Build a Port in the origin city first.' :
    optionsQuery.data.availableShips < 1 ? 'All trade ships from this city are away.' :
    optionsQuery.data.destinations.length === 0 ? 'Found a second city before sending resources.' :
    !destinationCityId ? 'Choose a destination city.' :
    load <= 0 ? 'Select at least one resource.' :
    load > capacity ? 'Selected resources exceed Port capacity.' :
    !hasEnoughResources ? 'Origin city does not have enough resources.' :
    null;

  if (citiesQuery.isLoading || optionsQuery.isLoading) {
    return <LoadingState message="Opening transport routes..." />;
  }

  if (citiesQuery.isError || (originCityId && optionsQuery.isError)) {
    return <ErrorState onRetry={() => void queryClient.invalidateQueries()} />;
  }

  return (
    <div className="space-y-6">
      <Panel
        title="Resource Transport"
        subtitle="Move resources between your own cities. Port level provides trade ships."
      >
        <div className="grid gap-4 lg:grid-cols-2">
          <label className="block text-sm font-bold text-text">
            Origin city
            <select
              className="mt-2 w-full rounded-md border border-border bg-surface px-3 py-2 text-sm"
              value={originCityId}
              onChange={(event) => updateOrigin(event.target.value)}
            >
              {(citiesQuery.data ?? []).map((city) => (
                <option key={city.id} value={city.id}>
                  {city.name}
                </option>
              ))}
            </select>
          </label>
          <label className="block text-sm font-bold text-text">
            Destination city
            <select
              className="mt-2 w-full rounded-md border border-border bg-surface px-3 py-2 text-sm"
              value={destinationCityId}
              onChange={(event) => setDestinationCityId(event.target.value)}
            >
              {(optionsQuery.data?.destinations ?? []).map((city) => (
                <option key={city.cityId} value={city.cityId}>
                  {city.cityName} · {city.islandName}
                </option>
              ))}
            </select>
          </label>
        </div>

        <div className="grid gap-3 rounded-md border border-border bg-surface/70 p-3 text-sm sm:grid-cols-4">
          <div>
            <p className="font-black text-muted">Port</p>
            <p className="text-text">Level {optionsQuery.data?.originPortLevel ?? 0}</p>
          </div>
          <div>
            <p className="font-black text-muted">Trade ships</p>
            <p className="text-text">
              {optionsQuery.data?.availableShips ?? 0} / {optionsQuery.data?.totalShips ?? 0}
            </p>
          </div>
          <div>
            <p className="font-black text-muted">Capacity</p>
            <p className={load > capacity ? 'text-danger' : 'text-text'}>
              {load.toLocaleString()} / {capacity.toLocaleString()}
            </p>
          </div>
          <div>
            <p className="font-black text-muted">Travel time</p>
            <p className="text-text">{formatSeconds(selectedDestination?.travelTimeSeconds ?? 0)}</p>
          </div>
        </div>

        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
          {RESOURCE_KEYS.map((resourceType) => (
            <div key={resourceType} className="rounded-md border border-border bg-surface/60 p-3">
              <label className="block text-xs font-black uppercase text-muted">
                {resourceType}
                <input
                  className="mt-2 w-full rounded-md border border-border bg-surface px-3 py-2 text-sm text-text"
                  min={0}
                  type="number"
                  value={resources[resourceType]}
                  onChange={(event) => updateResource(resourceType, Number(event.target.value))}
                />
              </label>
              <p className="mt-2 text-xs text-muted">
                Available: {(optionsQuery.data?.resources[resourceType] ?? 0).toLocaleString()}
              </p>
              <div className="mt-2 flex flex-wrap gap-2">
                <Button variant="secondary" className="px-2 py-1 text-xs" onClick={() => fillResource(resourceType, 0.25)}>
                  25%
                </Button>
                <Button variant="secondary" className="px-2 py-1 text-xs" onClick={() => fillResource(resourceType, 0.5)}>
                  50%
                </Button>
                <Button variant="secondary" className="px-2 py-1 text-xs" onClick={() => fillResource(resourceType, 1)}>
                  Max
                </Button>
                <Button variant="ghost" className="px-2 py-1 text-xs" onClick={() => updateResource(resourceType, 0)}>
                  Clear
                </Button>
              </div>
            </div>
          ))}
        </div>

        {disabledReason ? <Alert variant="warning">{disabledReason}</Alert> : null}
        {startMutation.isError ? <Alert variant="danger">{startMutation.error.message}</Alert> : null}
        {cancelMutation.isError ? <Alert variant="danger">{cancelMutation.error.message}</Alert> : null}
        <Button disabled={Boolean(disabledReason) || startMutation.isPending} onClick={() => startMutation.mutate()}>
          {startMutation.isPending ? 'Sending...' : 'Start transport'}
        </Button>
      </Panel>

      <Panel title="Active Transports">
        {activeMovements.length === 0 ? (
          <p className="text-sm text-muted">No active transports.</p>
        ) : (
          <div className="space-y-3">
            {activeMovements.map((movement) => (
              <div key={movement.id} className="rounded-md border border-border bg-surface/60 p-3">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <p className="font-bold text-text">
                    {movement.originCity.name} to {movement.destinationCity?.name ?? 'destination'}
                  </p>
                  <div className="flex flex-wrap items-center gap-3">
                    <span className="rounded-full bg-primary/10 px-2 py-1 text-xs font-bold uppercase text-primary">
                      {movement.status === 'returning' ? 'Returning' : 'In transit'}
                    </span>
                    <Timer
                      finishesAt={
                        movement.status === 'returning'
                          ? (movement.returnArrivalTime ?? movement.arrivalTime)
                          : movement.arrivalTime
                      }
                      onComplete={() => {
                        void queryClient.invalidateQueries({ queryKey: ['movements'] });
                        void queryClient.invalidateQueries({ queryKey: ['transport-options', originCityId] });
                      }}
                    />
                  </div>
                </div>
                <p className="mt-2 text-sm text-muted">
                  {formatPayload(movement.payload?.resources ?? null)}
                  {movement.payload?.shipsUsed ? ` · ${movement.payload.shipsUsed} ship(s)` : ''}
                </p>
                {movement.status === 'in_transit' ? (
                  <Button
                    variant="secondary"
                    className="mt-3"
                    disabled={cancelMutation.isPending}
                    onClick={() => cancelMutation.mutate(movement.id)}
                  >
                    Cancel transport
                  </Button>
                ) : null}
              </div>
            ))}
          </div>
        )}
      </Panel>
    </div>
  );
}

function formatSeconds(seconds: number): string {
  if (seconds <= 0) return '-';
  const minutes = Math.floor(seconds / 60);
  const remainingSeconds = seconds % 60;
  return minutes > 0 ? `${minutes}m ${remainingSeconds}s` : `${remainingSeconds}s`;
}

function formatPayload(payload: ResourceBalance | null): string {
  if (!payload) return 'No resources';
  const entries = RESOURCE_KEYS.filter((resourceType) => payload[resourceType] > 0).map(
    (resourceType) => `${payload[resourceType].toLocaleString()} ${resourceType}`,
  );

  return entries.length > 0 ? entries.join(', ') : 'No resources';
}
