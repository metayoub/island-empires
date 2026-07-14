type ResearchSummaryPanelProps = {
  researchPoints: number;
  researchPointsPerHour: number;
  scientists: number;
  academyLevel: number;
};

export function ResearchSummaryPanel({
  researchPoints,
  researchPointsPerHour,
  scientists,
  academyLevel,
}: ResearchSummaryPanelProps) {
  return (
    <section className="game-surface game-frame rounded-lg p-5">
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-[11px] font-black uppercase tracking-wide text-primary">Academy Ledger</p>
          <h2 className="mt-1 text-xl font-black text-text">Research</h2>
        </div>
        <span className="rounded-full border border-[#d6b982] bg-[#fff8e9] px-3 py-1 text-xs font-black uppercase tracking-wide text-[#7a5838] shadow-sm">
          Knowledge
        </span>
      </div>
      <div className="mt-4 grid gap-4 sm:grid-cols-4">
        <SummaryStat icon="R" label="Research points" value={researchPoints} />
        <SummaryStat icon="P" label="Production" value={`+${researchPointsPerHour}/hour`} />
        <SummaryStat icon="S" label="Scientists" value={scientists} />
        <SummaryStat icon="A" label="Academy level" value={academyLevel} />
      </div>
      {academyLevel < 1 ? (
        <p className="mt-4 rounded-md border border-warning/30 bg-warning/10 px-3 py-2 text-sm font-bold text-warning">
          Build the Academy to assign scientists and generate research points.
        </p>
      ) : null}
    </section>
  );
}

function SummaryStat({ icon, label, value }: { icon: string; label: string; value: string | number }) {
  return (
    <div className="rounded-md border border-border bg-surface/70 px-3 py-3 shadow-inner">
      <div className="flex items-center gap-2">
        <span className="flex h-8 w-8 items-center justify-center rounded-full bg-primary/10 text-xs font-black text-primary">
          {icon}
        </span>
        <p className="text-[11px] font-black uppercase tracking-wide text-muted">{label}</p>
      </div>
      <p className="mt-2 text-xl font-black text-text">{value}</p>
    </div>
  );
}
