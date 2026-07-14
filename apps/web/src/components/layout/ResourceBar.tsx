import { RESOURCE_LABELS, RESOURCE_TYPES } from '@island-empires/config';
import type { ResourceProduction, StorageSummary } from '@island-empires/shared-types';
import { HelpIcon } from '../ui/HelpIcon';
import { ResourceValue } from '../ui/ResourceValue';

const RESOURCE_ORDER = [
  RESOURCE_TYPES.WOOD,
  RESOURCE_TYPES.GOLD,
  RESOURCE_TYPES.MARBLE,
  RESOURCE_TYPES.WINE,
  RESOURCE_TYPES.CRYSTAL,
  RESOURCE_TYPES.SULFUR,
] as const;

const PRODUCTION_PER_HOUR_KEY = {
  [RESOURCE_TYPES.WOOD]: 'woodPerHour',
  [RESOURCE_TYPES.GOLD]: 'goldPerHour',
  [RESOURCE_TYPES.MARBLE]: 'marblePerHour',
  [RESOURCE_TYPES.WINE]: 'winePerHour',
  [RESOURCE_TYPES.CRYSTAL]: 'crystalPerHour',
  [RESOURCE_TYPES.SULFUR]: 'sulfurPerHour',
} as const satisfies Record<(typeof RESOURCE_ORDER)[number], keyof ResourceProduction>;

const RESOURCE_HELP_TEXT = {
  [RESOURCE_TYPES.WOOD]: 'Wood is used for most early buildings and ships.',
  [RESOURCE_TYPES.GOLD]: 'Gold pays for building upgrades and future trade.',
  [RESOURCE_TYPES.MARBLE]:
    'Marble is harvested from marble islands and used for advanced city upgrades.',
  [RESOURCE_TYPES.WINE]: 'Wine boosts happiness through the Tavern.',
  [RESOURCE_TYPES.CRYSTAL]:
    'Crystal is harvested from crystal islands and supports advanced research.',
  [RESOURCE_TYPES.SULFUR]:
    'Sulfur is harvested from sulfur islands and supports military production.',
} as const satisfies Record<(typeof RESOURCE_ORDER)[number], string>;

const RESOURCE_ICONS = {
  [RESOURCE_TYPES.WOOD]: 'W',
  [RESOURCE_TYPES.GOLD]: 'G',
  [RESOURCE_TYPES.MARBLE]: 'M',
  [RESOURCE_TYPES.WINE]: 'V',
  [RESOURCE_TYPES.CRYSTAL]: 'C',
  [RESOURCE_TYPES.SULFUR]: 'S',
} as const satisfies Record<(typeof RESOURCE_ORDER)[number], string>;

type ResourceBarProps = {
  resources: Record<(typeof RESOURCE_ORDER)[number], number>;
  production: ResourceProduction;
  storage: StorageSummary;
};

export function ResourceBar({ resources, production, storage }: ResourceBarProps) {
  return (
    <section className="sticky top-0 z-40 border-b border-border/80 bg-surface/95 shadow-md backdrop-blur">
      <div className="mx-auto grid max-w-[1760px] grid-cols-2 divide-x divide-border/80 sm:grid-cols-3 lg:grid-cols-6">
        {RESOURCE_ORDER.map((resourceType) => {
          const perHour = production[PRODUCTION_PER_HOUR_KEY[resourceType]];
          const isFull = storage.fullResources.includes(resourceType);
          const isLow = resources[resourceType] < Math.max(25, storage.capacityPerResource * 0.15);

          return (
            <div key={resourceType} className="relative">
              <ResourceValue
                label={RESOURCE_LABELS[resourceType]}
                icon={RESOURCE_ICONS[resourceType]}
                value={resources[resourceType]}
                capacity={storage.capacityPerResource}
                perHour={perHour}
                isFull={isFull}
                isLow={isLow}
              />
              <span className="absolute right-2 top-2">
                <HelpIcon label={RESOURCE_HELP_TEXT[resourceType]} />
              </span>
            </div>
          );
        })}
      </div>
    </section>
  );
}
