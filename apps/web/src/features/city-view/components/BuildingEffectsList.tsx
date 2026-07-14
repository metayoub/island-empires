import type { BuildingEffectSummary } from '@island-empires/shared-types';

type BuildingEffectsListProps = {
  effects: BuildingEffectSummary[];
};

export function BuildingEffectsList({ effects }: BuildingEffectsListProps) {
  if (effects.length === 0) {
    return null;
  }

  return (
    <dl className="space-y-2 text-sm">
      {effects.map((effect) => (
        <div key={effect.label} className="rounded border border-border/70 bg-surface-strong/40 px-3 py-2">
          <dt className="font-semibold text-muted">{effect.label}</dt>
          <dd className="mt-0.5 font-bold text-text">
            {effect.current}
            {effect.next ? (
              <span className="font-semibold text-success"> → {effect.next}</span>
            ) : null}
          </dd>
          {effect.note ? <p className="mt-1 text-xs font-medium text-muted">{effect.note}</p> : null}
        </div>
      ))}
    </dl>
  );
}
