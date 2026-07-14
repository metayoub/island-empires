import type { HappinessSummary } from '@island-empires/shared-types';

type HappinessPanelProps = {
  happiness: HappinessSummary;
};

const STATUS_LABELS: Record<HappinessSummary['status'], string> = {
  unhappy: 'Unhappy',
  neutral: 'Neutral',
  happy: 'Happy',
  very_happy: 'Very Happy',
};

export function HappinessPanel({ happiness }: HappinessPanelProps) {
  return (
    <section className="game-surface game-frame rounded-lg p-5">
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-[11px] font-black uppercase tracking-wide text-muted">Morale</p>
          <h2 className="mt-1 text-lg font-black text-text">Happiness</h2>
          <p className="mt-2 text-3xl font-black text-text">{happiness.value}</p>
        </div>
        <span className="rounded border border-primary/20 bg-primary/10 px-2 py-1 text-xs font-black uppercase tracking-wide text-primary">
          {STATUS_LABELS[happiness.status]}
        </span>
      </div>
      <dl className="mt-4 space-y-2 text-sm">
        <div className="flex justify-between gap-4 rounded-md border border-border bg-surface/70 px-3 py-2">
          <dt className="font-bold text-muted">Base</dt>
          <dd className="font-black text-text">{happiness.base}</dd>
        </div>
        <div className="flex justify-between gap-4 rounded-md border border-border bg-surface/70 px-3 py-2">
          <dt className="font-bold text-muted">Tavern bonus</dt>
          <dd className="font-black text-success">+{happiness.tavernBonus}</dd>
        </div>
        <div className="flex justify-between gap-4 rounded-md border border-border bg-surface/70 px-3 py-2">
          <dt className="font-bold text-muted">Health support</dt>
          <dd className="font-black text-success">+{happiness.healthSupport}</dd>
        </div>
        <div className="flex justify-between gap-4 rounded-md border border-border bg-surface/70 px-3 py-2">
          <dt className="font-bold text-muted">Health pressure relief</dt>
          <dd className="font-black text-success">-{happiness.healthPressureRelief}</dd>
        </div>
        <div className="flex justify-between gap-4 rounded-md border border-border bg-surface/70 px-3 py-2">
          <dt className="font-bold text-muted">Health growth bonus</dt>
          <dd className="font-black text-success">+{happiness.healthGrowthBonusPercent}%</dd>
        </div>
        <div className="flex justify-between gap-4 rounded-md border border-border bg-surface/70 px-3 py-2">
          <dt className="font-bold text-muted">Population pressure</dt>
          <dd className="font-black text-danger">-{happiness.populationPressure}</dd>
        </div>
        <div className="flex justify-between gap-4 rounded-md border border-border bg-surface/70 px-3 py-2">
          <dt className="font-bold text-muted">Administration</dt>
          <dd className="font-black text-danger">-{happiness.administrationPenalty}</dd>
        </div>
      </dl>
      {happiness.value < 40 ? (
        <p className="mt-3 rounded-md border border-danger/30 bg-danger/10 px-3 py-2 text-sm font-bold text-danger">
          Low happiness is slowing population growth. Build or upgrade the Tavern and Hospital to
          improve city stability.
        </p>
      ) : null}
    </section>
  );
}
