import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';
import { Alert, Button, LoadingState, Timer } from '../../../components/ui';
import { useAppStore } from '../../../stores/app.store';
import { getSpyOverview, trainSpies } from '../scouting.api';

const RESOURCE_KEYS = ['wood', 'gold', 'marble', 'wine', 'crystal', 'sulfur'] as const;

function formatCost(cost: Record<string, number>, quantity = 1): string {
  const parts = RESOURCE_KEYS.filter((resource) => (cost[resource] ?? 0) > 0).map(
    (resource) => `${(cost[resource] ?? 0) * quantity} ${resource}`,
  );

  return parts.length > 0 ? parts.join(' · ') : 'Free';
}

function formatDuration(seconds: number): string {
  const minutes = Math.floor(seconds / 60);
  const remainingSeconds = seconds % 60;

  return minutes > 0 ? `${minutes}m ${remainingSeconds}s` : `${remainingSeconds}s`;
}

export function SpyAgencyPanel() {
  const queryClient = useQueryClient();
  const selectedCityId = useAppStore((state) => state.selectedCityId);
  const [quantityText, setQuantityText] = useState('1');

  const spyQuery = useQuery({
    queryKey: ['spy-overview', selectedCityId],
    queryFn: () => getSpyOverview(selectedCityId ?? ''),
    enabled: Boolean(selectedCityId),
    retry: 1,
    refetchInterval: (query) => ((query.state.data?.trainingQueue.length ?? 0) > 0 ? 5000 : false),
  });

  const trainMutation = useMutation({
    mutationFn: (quantity: number) => trainSpies(selectedCityId ?? '', { quantity }),
    onSuccess: () => {
      setQuantityText('1');
      void queryClient.invalidateQueries({ queryKey: ['spy-overview', selectedCityId] });
      void queryClient.invalidateQueries({ queryKey: ['city-overview', selectedCityId] });
      void queryClient.invalidateQueries({ queryKey: ['reports'] });
    },
  });

  if (!selectedCityId) return null;
  if (spyQuery.isPending) return <LoadingState message="Loading Spy Agency..." />;
  if (spyQuery.isError || !spyQuery.data) {
    return <Alert variant="danger">The Spy Agency overview could not be loaded.</Alert>;
  }

  const overview = spyQuery.data;
  const quantity = Math.floor(Number(quantityText));
  const canTrain =
    overview.city.spyAgencyLevel > 0 &&
    overview.trainingQueue.length === 0 &&
    Number.isFinite(quantity) &&
    quantity > 0 &&
    !trainMutation.isPending;

  return (
    <div className="space-y-3 rounded-md border border-border bg-surface/60 p-3">
      <div className="grid gap-2 text-xs sm:grid-cols-3">
        <div className="rounded border border-border bg-surface/70 px-2 py-2">
          <p className="font-black uppercase tracking-wide text-muted">Available</p>
          <p className="mt-1 text-lg font-black text-text">{overview.spies.available}</p>
        </div>
        <div className="rounded border border-border bg-surface/70 px-2 py-2">
          <p className="font-black uppercase tracking-wide text-muted">Training</p>
          <p className="mt-1 text-lg font-black text-text">{overview.spies.training}</p>
        </div>
        <div className="rounded border border-border bg-surface/70 px-2 py-2">
          <p className="font-black uppercase tracking-wide text-muted">Time each</p>
          <p className="mt-1 font-semibold text-text">
            {formatDuration(overview.unit.trainingTimeSeconds)}
          </p>
        </div>
      </div>

      {overview.trainingQueue.map((job) => (
        <div
          key={job.id}
          className="flex items-center justify-between rounded-md border border-primary/20 bg-primary/10 px-3 py-2 text-sm"
        >
          <span className="font-semibold text-primary">{job.quantity} spies training</span>
          <Timer
            finishesAt={job.finishesAt}
            onComplete={() => {
              void queryClient.invalidateQueries({ queryKey: ['spy-overview', selectedCityId] });
              void queryClient.invalidateQueries({ queryKey: ['reports'] });
            }}
          />
        </div>
      ))}

      <div className="rounded-md border border-border bg-surface/70 p-3">
        <p className="text-[11px] font-black uppercase tracking-wide text-muted">Train spies</p>
        <p className="mt-1 text-sm font-semibold text-muted">
          Cost each: {formatCost(overview.unit.cost)}
        </p>
        <div className="mt-3 flex items-center gap-2">
          <input
            aria-label="Spy quantity"
            className="w-24 rounded-md border border-border bg-surface px-3 py-2 text-sm text-text"
            type="number"
            min={1}
            value={quantityText}
            onChange={(event) => setQuantityText(event.target.value)}
          />
          <Button
            className="flex-1 justify-center"
            disabled={!canTrain}
            onClick={() => trainMutation.mutate(quantity)}
          >
            {trainMutation.isPending ? 'Training...' : 'Train Spies'}
          </Button>
        </div>
        <p className="mt-2 text-xs font-semibold text-muted">
          Total: {formatCost(overview.unit.cost, Number.isFinite(quantity) ? Math.max(1, quantity) : 1)}
          {' '}· {formatDuration(
            overview.unit.trainingTimeSeconds *
              (Number.isFinite(quantity) ? Math.max(1, quantity) : 1),
          )}
        </p>
      </div>

      {overview.city.spyAgencyLevel === 0 ? (
        <Alert variant="info">Build the Spy Agency to level 1 before training spies.</Alert>
      ) : null}
      {overview.trainingQueue.length > 0 ? (
        <Alert variant="info">This city already has spies in training.</Alert>
      ) : null}
      {trainMutation.isError ? (
        <Alert variant="danger">{(trainMutation.error as Error).message}</Alert>
      ) : null}
    </div>
  );
}
