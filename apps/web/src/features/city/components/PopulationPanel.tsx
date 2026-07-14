import type { PopulationSummary } from '@island-empires/shared-types';

type PopulationPanelProps = {
  population: PopulationSummary;
};

export function PopulationPanel({ population }: PopulationPanelProps) {
  return (
    <section className="game-surface game-frame rounded-lg p-5">
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-[11px] font-black uppercase tracking-wide text-muted">Citizens</p>
          <h2 className="mt-1 text-lg font-black text-text">Population</h2>
          <p className="mt-2 text-3xl font-black text-text">
            {population.current} / {population.capacity}
          </p>
        </div>
        <span
          className={`rounded border px-2 py-1 text-xs font-black uppercase tracking-wide ${
            population.isAtCapacity
              ? 'border-warning/20 bg-warning/10 text-warning'
              : 'border-success/20 bg-success/10 text-success'
          }`}
        >
          {population.isAtCapacity ? 'At capacity' : 'Growing'}
        </span>
      </div>
      <p className="mt-3 rounded-md border border-border bg-surface/70 px-3 py-2 text-sm font-bold text-muted">
        Growth: +{population.growthPerHour.toFixed(2)} citizens/hour
      </p>
      {population.isAtCapacity ? (
        <p className="mt-3 rounded-md border border-warning/30 bg-warning/10 px-3 py-2 text-sm font-bold text-warning">
          Population has reached capacity. Upgrade City Hall to allow more citizens.
        </p>
      ) : null}
    </section>
  );
}
