import type { ResourceProduction, StorageSummary } from '@island-empires/shared-types';

type ProductionPanelProps = {
  production: ResourceProduction;
  storage: StorageSummary;
};

export function ProductionPanel({ production, storage }: ProductionPanelProps) {
  return (
    <section className="game-surface game-frame rounded-lg p-5">
      <p className="text-[11px] font-black uppercase tracking-wide text-muted">Economy</p>
      <h2 className="mt-1 text-lg font-black text-text">Production</h2>
      <dl className="mt-4 grid grid-cols-3 gap-3 text-center">
        <ProductionStat label="Wood production" value={`${production.woodPerHour}/h`} />
        <ProductionStat label="Gold production" value={`${production.goldPerHour}/h`} />
        <ProductionStat label="Storage capacity" value={storage.capacityPerResource.toString()} />
      </dl>
    </section>
  );
}

function ProductionStat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-md border border-border bg-surface/70 px-3 py-3 shadow-inner">
      <dt className="text-[11px] font-black uppercase tracking-wide text-muted">{label}</dt>
      <dd className="mt-1 text-xl font-black text-text">{value}</dd>
    </div>
  );
}
