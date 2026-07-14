import type { HappinessSummary, PopulationSummary } from '@island-empires/shared-types';

type CityGrowthSummaryProps = {
  population: PopulationSummary;
  happiness: HappinessSummary;
};

const STATUS_LABELS: Record<HappinessSummary['status'], string> = {
  unhappy: 'Unhappy',
  neutral: 'Neutral',
  happy: 'Happy',
  very_happy: 'Very Happy',
};

export function CityGrowthSummary({ population, happiness }: CityGrowthSummaryProps) {
  return (
    <section className="game-surface game-frame rounded-lg p-5">
      <p className="text-[11px] font-black uppercase tracking-wide text-muted">Forecast</p>
      <h2 className="mt-1 text-lg font-black text-text">City Growth</h2>
      <div className="mt-4 grid gap-3 sm:grid-cols-3">
        <GrowthStat label="Population status" value={population.isAtCapacity ? 'At capacity' : 'Growing'} />
        <GrowthStat label="Growth rate" value={`+${population.growthPerHour.toFixed(2)}/h`} />
        <GrowthStat label="Happiness status" value={STATUS_LABELS[happiness.status]} />
      </div>
    </section>
  );
}

function GrowthStat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-md border border-border bg-surface/70 px-3 py-3 shadow-inner">
      <p className="text-[11px] font-black uppercase tracking-wide text-muted">{label}</p>
      <p className="mt-1 text-lg font-black text-text">{value}</p>
    </div>
  );
}
