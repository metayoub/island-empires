import type { ActiveConstructionSummary } from '@island-empires/shared-types';
import { BuildingTimer } from './BuildingTimer';

type ActiveConstructionPanelProps = {
  activeConstruction: ActiveConstructionSummary | null;
  onComplete: () => void;
};

export function ActiveConstructionPanel({
  activeConstruction,
  onComplete,
}: ActiveConstructionPanelProps) {
  return (
    <section className="game-surface game-frame rounded-lg p-5">
      <div className="flex items-center justify-between gap-3">
        <div>
          <p className="text-[11px] font-black uppercase tracking-wide text-muted">Build Queue</p>
          <h2 className="mt-1 text-lg font-black text-text">Active Construction</h2>
        </div>
        {activeConstruction ? (
          <span className="rounded border border-primary/20 bg-primary/10 px-2 py-1 text-xs font-black uppercase tracking-wide text-primary">
            Upgrading
          </span>
        ) : null}
      </div>
      {activeConstruction ? (
        <div className="mt-4 flex flex-wrap items-center justify-between gap-3 rounded-md border border-border bg-surface/70 p-3 shadow-inner">
          <div className="flex items-center gap-3">
            <span className="flex h-10 w-10 items-center justify-center rounded bg-secondary/15 text-sm font-black text-secondary">
              B
            </span>
            <div>
              <p className="font-black text-text">{activeConstruction.buildingName}</p>
              <p className="text-sm font-semibold text-muted">
              Level {activeConstruction.fromLevel} to {activeConstruction.toLevel}
              </p>
            </div>
          </div>
          <BuildingTimer finishesAt={activeConstruction.finishesAt} onComplete={onComplete} />
        </div>
      ) : (
        <p className="mt-3 rounded-md border border-dashed border-border bg-surface/60 px-3 py-2 text-sm font-semibold text-muted">
          No active construction.
        </p>
      )}
    </section>
  );
}
