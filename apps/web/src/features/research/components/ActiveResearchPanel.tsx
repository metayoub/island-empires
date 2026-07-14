import type { ActiveResearch } from '@island-empires/shared-types';
import { BuildingTimer } from '../../city/components/BuildingTimer';

type ActiveResearchPanelProps = {
  activeResearch: ActiveResearch | null;
  onComplete: () => void;
};

export function ActiveResearchPanel({ activeResearch, onComplete }: ActiveResearchPanelProps) {
  return (
    <section className="game-surface game-frame rounded-lg p-5">
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-[11px] font-black uppercase tracking-wide text-primary">Laboratory</p>
          <h2 className="mt-1 text-xl font-black text-text">Active Research</h2>
        </div>
        {activeResearch ? (
          <span className="rounded border border-warning/20 bg-warning/10 px-2 py-1 text-xs font-black uppercase tracking-wide text-warning">
            In Progress
          </span>
        ) : null}
      </div>
      {activeResearch ? (
        <div className="mt-4 flex flex-wrap items-center justify-between gap-3 rounded-md border border-border bg-surface/70 p-3 shadow-inner">
          <div className="flex items-center gap-3">
            <span className="flex h-10 w-10 items-center justify-center rounded-md bg-warning/10 text-sm font-black text-warning">
              R
            </span>
            <p className="font-black text-text">{activeResearch.technologyName}</p>
          </div>
          <BuildingTimer finishesAt={activeResearch.finishesAt} onComplete={onComplete} />
        </div>
      ) : (
        <p className="mt-3 rounded-md border border-dashed border-border bg-surface/60 px-3 py-2 text-sm font-semibold text-muted">
          No active research.
        </p>
      )}
    </section>
  );
}
