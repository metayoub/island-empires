import type { CityViewBuilding } from '@island-empires/shared-types';
import { CITY_LAYOUT } from '../city-layout.config';
import { CityDistrictLabel } from '../CityDistrictLabel';
import { BuildingHotspot } from './BuildingHotspot';
import { CityBackground } from './CityBackground';
import { EmptySlot } from './EmptySlot';

type CitySceneProps = {
  buildings: CityViewBuilding[];
  selectedBuildingType: string | null;
  showLabels: boolean;
  onSelectBuilding: (buildingType: string) => void;
  onTimerComplete: () => void;
};

export function CityScene({
  buildings,
  selectedBuildingType,
  showLabels,
  onSelectBuilding,
  onTimerComplete,
}: CitySceneProps) {
  return (
    <div
      className="game-frame relative w-full overflow-hidden rounded-lg bg-[#2e6b74]"
      style={{ aspectRatio: CITY_LAYOUT.aspectRatio }}
    >
      <CityBackground />
      {showLabels
        ? CITY_LAYOUT.districts?.map((district) => (
            <CityDistrictLabel key={district.id} label={district.label} x={district.x} y={district.y} />
          ))
        : null}
      {CITY_LAYOUT.emptySlots.map((slot) => (
        <EmptySlot key={slot.id} slot={slot} />
      ))}
      {buildings.map((building) => (
        <BuildingHotspot
          key={building.id}
          building={building}
          isSelected={building.type === selectedBuildingType}
          showLabels={showLabels}
          onSelect={onSelectBuilding}
          onTimerComplete={onTimerComplete}
        />
      ))}
    </div>
  );
}
