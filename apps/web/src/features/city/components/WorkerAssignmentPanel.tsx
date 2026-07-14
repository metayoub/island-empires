import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useEffect, useState } from 'react';
import type { CitizenSummary, PopulationSummary } from '@island-empires/shared-types';
import { Button } from '../../../components/ui/Button';
import { Panel } from '../../../components/ui/Panel';
import { assignWorkers } from '../city.api';

type WorkerAssignmentPanelProps = {
  cityId: string;
  population: PopulationSummary;
  citizens: CitizenSummary;
  academyLevel: number;
  layout?: 'default' | 'compact';
};

export function WorkerAssignmentPanel({
  cityId,
  population,
  citizens,
  academyLevel,
}: WorkerAssignmentPanelProps) {
  return (
    <Panel
      title="Worker Assignment"
      subtitle={`Current population: ${population.current} / ${population.capacity}`}
    >
      <WorkerAssignmentControls
        cityId={cityId}
        population={population}
        citizens={citizens}
        academyLevel={academyLevel}
      />
    </Panel>
  );
}

export function WorkerAssignmentControls({
  cityId,
  population,
  citizens,
  academyLevel,
  layout = 'default',
}: WorkerAssignmentPanelProps) {
  const queryClient = useQueryClient();
  const [woodWorkers, setWoodWorkers] = useState(citizens.woodWorkers);
  const [goldWorkers, setGoldWorkers] = useState(citizens.goldWorkers);
  const [luxuryWorkers, setLuxuryWorkers] = useState(citizens.luxuryWorkers);
  const [scientists, setScientists] = useState(citizens.scientists);
  const academyAvailable = academyLevel >= 1;

  useEffect(() => {
    setWoodWorkers(citizens.woodWorkers);
    setGoldWorkers(citizens.goldWorkers);
    setLuxuryWorkers(citizens.luxuryWorkers);
    setScientists(citizens.scientists);
  }, [citizens.woodWorkers, citizens.goldWorkers, citizens.luxuryWorkers, citizens.scientists]);

  const mutation = useMutation({
    mutationFn: () =>
      assignWorkers(cityId, { woodWorkers, goldWorkers, luxuryWorkers, scientists }),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['city-overview', cityId] });
      void queryClient.invalidateQueries({ queryKey: ['research-overview'] });
      void queryClient.invalidateQueries({ queryKey: ['quest-overview'] });
      void queryClient.invalidateQueries({ queryKey: ['next-action'] });
    },
  });

  const idleCitizens = population.current - woodWorkers - goldWorkers - luxuryWorkers - scientists;
  const isOverPopulation = idleCitizens < 0;
  const hasChanges =
    woodWorkers !== citizens.woodWorkers ||
    goldWorkers !== citizens.goldWorkers ||
    luxuryWorkers !== citizens.luxuryWorkers ||
    scientists !== citizens.scientists;

  function adjustWoodWorkers(delta: number) {
    setWoodWorkers((current) => Math.max(0, current + delta));
  }

  function adjustGoldWorkers(delta: number) {
    setGoldWorkers((current) => Math.max(0, current + delta));
  }

  function adjustLuxuryWorkers(delta: number) {
    setLuxuryWorkers((current) => Math.max(0, current + delta));
  }

  function adjustScientists(delta: number) {
    setScientists((current) => Math.max(0, current + delta));
  }

  return (
    <div className="space-y-4">
      <div className={layout === 'compact' ? 'space-y-2' : 'grid gap-4 sm:grid-cols-5'}>
        <WorkerStepper
          label="Wood workers"
          value={woodWorkers}
          onDecrease={() => adjustWoodWorkers(-1)}
          onIncrease={() => adjustWoodWorkers(1)}
          layout={layout}
        />
        <WorkerStepper
          label="Gold workers"
          value={goldWorkers}
          onDecrease={() => adjustGoldWorkers(-1)}
          onIncrease={() => adjustGoldWorkers(1)}
          layout={layout}
        />
        <WorkerStepper
          label="Luxury workers"
          value={luxuryWorkers}
          onDecrease={() => adjustLuxuryWorkers(-1)}
          onIncrease={() => adjustLuxuryWorkers(1)}
          layout={layout}
        />
        <WorkerStepper
          label="Scientists"
          value={scientists}
          onDecrease={() => adjustScientists(-1)}
          onIncrease={() => adjustScientists(1)}
          disabled={!academyAvailable}
          layout={layout}
        />
        <div
          className={
            layout === 'compact'
              ? 'flex min-h-12 items-center justify-between gap-3 rounded-md border border-border bg-surface/70 px-3 py-2 shadow-inner'
              : 'rounded-md border border-border bg-surface/70 px-3 py-3 text-center shadow-inner'
          }
        >
          <p
            className={
              layout === 'compact'
                ? 'text-xs font-black uppercase text-muted'
                : 'text-[11px] font-black uppercase tracking-wide text-muted'
            }
          >
            Idle citizens
          </p>
          <p
            className={`${layout === 'compact' ? 'text-lg' : 'mt-1 text-xl'} font-black ${
              isOverPopulation ? 'text-danger' : 'text-text'
            }`}
          >
            {idleCitizens}
          </p>
        </div>
      </div>

      {!academyAvailable && (
        <p className="text-sm font-semibold text-warning">
          Build the Academy to assign scientists.
        </p>
      )}

      <p className="text-sm font-semibold text-muted">
        Luxury workers produce this island's luxury resource after the Luxury Extractor is built.
      </p>

      {isOverPopulation && (
        <p className="text-sm font-semibold text-danger">
          Assigned citizens cannot exceed city population ({population.current}).
        </p>
      )}

      {mutation.isError && (
        <p className="text-sm font-semibold text-danger">{mutation.error.message}</p>
      )}

      <Button
        onClick={() => mutation.mutate()}
        disabled={isOverPopulation || !hasChanges || mutation.isPending}
        className={layout === 'compact' ? 'w-full justify-center' : ''}
      >
        {mutation.isPending ? 'Saving...' : 'Save assignment'}
      </Button>
    </div>
  );
}

type WorkerStepperProps = {
  label: string;
  value: number;
  onDecrease: () => void;
  onIncrease: () => void;
  disabled?: boolean;
  layout?: 'default' | 'compact';
};

function WorkerStepper({
  label,
  value,
  onDecrease,
  onIncrease,
  disabled,
  layout = 'default',
}: WorkerStepperProps) {
  if (layout === 'compact') {
    return (
      <div
        className={`flex min-h-14 items-center justify-between gap-3 rounded-md border border-border bg-surface/70 px-3 py-2 shadow-inner ${disabled ? 'opacity-50' : ''}`}
      >
        <p className="min-w-0 flex-1 text-xs font-black uppercase text-muted">{label}</p>
        <div className="grid grid-cols-[2rem_2.25rem_2rem] items-center gap-1">
          <button
            type="button"
            onClick={onDecrease}
            disabled={disabled}
            className="flex h-8 w-8 items-center justify-center rounded border border-border bg-surface text-sm font-black text-primary transition-colors hover:bg-surface-strong disabled:cursor-not-allowed disabled:text-muted"
            aria-label={`Decrease ${label}`}
          >
            -
          </button>
          <span className="text-center text-lg font-black text-text">{value}</span>
          <button
            type="button"
            onClick={onIncrease}
            disabled={disabled}
            className="flex h-8 w-8 items-center justify-center rounded border border-border bg-surface text-sm font-black text-primary transition-colors hover:bg-surface-strong disabled:cursor-not-allowed disabled:text-muted"
            aria-label={`Increase ${label}`}
          >
            +
          </button>
        </div>
      </div>
    );
  }

  return (
    <div
      className={`rounded-md border border-border bg-surface/70 px-3 py-3 text-center shadow-inner ${disabled ? 'opacity-50' : ''}`}
    >
      <p className="text-[11px] font-black uppercase tracking-wide text-muted">{label}</p>
      <div className="mt-1 flex items-center justify-center gap-3">
        <button
          type="button"
          onClick={onDecrease}
          disabled={disabled}
          className="h-7 w-7 rounded border border-border bg-surface text-sm font-black text-primary transition-colors hover:bg-surface-strong disabled:cursor-not-allowed disabled:text-muted"
          aria-label={`Decrease ${label}`}
        >
          -
        </button>
        <span className="w-8 text-lg font-black text-text">{value}</span>
        <button
          type="button"
          onClick={onIncrease}
          disabled={disabled}
          className="h-7 w-7 rounded border border-border bg-surface text-sm font-black text-primary transition-colors hover:bg-surface-strong disabled:cursor-not-allowed disabled:text-muted"
          aria-label={`Increase ${label}`}
        >
          +
        </button>
      </div>
    </div>
  );
}
