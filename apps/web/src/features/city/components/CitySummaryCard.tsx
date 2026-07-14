import type { CitySummary } from '@island-empires/shared-types';

type CitySummaryCardProps = {
  city: CitySummary;
};

export function CitySummaryCard({ city }: CitySummaryCardProps) {
  return (
    <section className="game-surface game-frame overflow-hidden rounded-lg p-5">
      <div className="flex flex-col gap-5 sm:flex-row sm:items-start sm:justify-between">
        <div className="flex items-start gap-3">
          <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-md border border-border bg-primary/10 text-lg font-black text-primary shadow-inner">
            C
          </span>
          <div>
            <p className="text-xs font-black uppercase tracking-wide text-primary">Selected City</p>
            <h2 className="mt-1 text-3xl font-black text-text">{city.name}</h2>
            <p className="mt-1 text-sm font-semibold text-muted">Mediterranean island capital</p>
          </div>
        </div>
        <dl className="grid grid-cols-3 gap-3 text-center sm:min-w-[360px]">
          <CityStat label="Level" value={city.level} />
          <CityStat label="Population" value={city.population} detail={`Cap ${city.populationCapacity}`} />
          <CityStat label="Happiness" value={city.happiness} />
        </dl>
      </div>
    </section>
  );
}

function CityStat({ label, value, detail }: { label: string; value: number; detail?: string }) {
  return (
    <div className="rounded-md border border-border bg-surface/70 px-3 py-3 shadow-inner">
      <dt className="text-[11px] font-black uppercase tracking-wide text-muted">{label}</dt>
      <dd className="mt-1 text-xl font-black text-text">{value}</dd>
      {detail ? <dd className="text-xs font-bold text-muted">{detail}</dd> : null}
    </div>
  );
}
