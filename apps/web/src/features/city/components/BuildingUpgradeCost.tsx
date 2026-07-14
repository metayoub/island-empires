import type { ResourceCost } from '@island-empires/shared-types';

const RESOURCE_LABELS: Array<[keyof ResourceCost, string]> = [
  ['wood', 'Wood'],
  ['gold', 'Gold'],
  ['marble', 'Marble'],
  ['wine', 'Wine'],
  ['crystal', 'Crystal'],
  ['sulfur', 'Sulfur'],
];

type BuildingUpgradeCostProps = {
  cost?: ResourceCost;
};

export function BuildingUpgradeCost({ cost }: BuildingUpgradeCostProps) {
  const entries = RESOURCE_LABELS.filter(([resourceType]) => (cost?.[resourceType] ?? 0) > 0);

  if (!cost || entries.length === 0) {
    return <p className="text-sm font-semibold text-muted">No resource cost.</p>;
  }

  return (
    <dl className="grid grid-cols-2 gap-2 text-sm">
      {entries.map(([resourceType, label]) => (
        <div
          key={resourceType}
          className="flex items-center justify-between rounded-md border border-border bg-surface/70 px-2 py-1 shadow-inner"
        >
          <dt className="font-bold text-muted">{label}</dt>
          <dd className="font-black text-text">{cost[resourceType]}</dd>
        </div>
      ))}
    </dl>
  );
}
