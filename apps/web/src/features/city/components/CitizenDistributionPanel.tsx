import type { CitizenSummary } from '@island-empires/shared-types';

type CitizenDistributionPanelProps = {
  citizens: CitizenSummary;
};

export function CitizenDistributionPanel({ citizens }: CitizenDistributionPanelProps) {
  return (
    <section className="game-surface game-frame rounded-lg p-5">
      <p className="text-[11px] font-black uppercase tracking-wide text-muted">Workforce</p>
      <h2 className="mt-1 text-lg font-black text-text">Citizens</h2>
      <dl className="mt-4 grid grid-cols-2 gap-3 text-center sm:grid-cols-4">
        <CitizenStat label="Wood workers" value={citizens.woodWorkers} />
        <CitizenStat label="Gold workers" value={citizens.goldWorkers} />
        <CitizenStat label="Luxury workers" value={citizens.luxuryWorkers} />
        <CitizenStat label="Idle citizens" value={citizens.idleCitizens} />
      </dl>
    </section>
  );
}

function CitizenStat({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-md border border-border bg-surface/70 px-3 py-3 shadow-inner">
      <dt className="text-[11px] font-black uppercase tracking-wide text-muted">{label}</dt>
      <dd className="mt-1 text-xl font-black text-text">{value}</dd>
    </div>
  );
}
