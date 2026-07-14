type ResourceValueProps = {
  label: string;
  value: number;
  icon?: string;
  capacity?: number;
  perHour?: number;
  isFull?: boolean;
  isLow?: boolean;
};

export function ResourceValue({ label, value, icon, capacity, perHour, isFull, isLow }: ResourceValueProps) {
  const perHourLabel =
    perHour === undefined ? null : perHour > 0 ? `+${perHour}/h` : `${perHour}/h`;

  return (
    <div
      className={`group px-3 py-3 transition-colors hover:bg-surface-strong/60 ${
        isFull ? 'bg-danger/5' : isLow ? 'bg-warning/5' : ''
      }`}
    >
      <div className="flex items-start gap-2.5">
        {icon ? (
          <span className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-full border border-border bg-surface text-sm font-black text-primary shadow-sm">
            {icon}
          </span>
        ) : null}
        <div className="min-w-0">
          <p className="truncate text-[11px] font-bold uppercase tracking-wide text-muted">{label}</p>
          <p
            className={`mt-0.5 text-xl font-black tabular-nums transition-transform duration-200 group-hover:scale-[1.03] ${
              isFull ? 'text-danger' : isLow ? 'text-warning' : 'text-text'
            }`}
          >
            {value}
            {capacity !== undefined ? (
              <span className="text-xs font-bold text-muted"> / {capacity}</span>
            ) : null}
          </p>
          {perHour !== undefined ? (
            <p
              className={`mt-0.5 text-xs font-bold ${
                isFull || perHour < 0 ? 'text-danger' : 'text-success'
              }`}
            >
              {isFull ? 'Storage full' : perHourLabel}
            </p>
          ) : null}
        </div>
      </div>
    </div>
  );
}
