import type { CityViewBuilding } from '@island-empires/shared-types';
import { useState } from 'react';
import { BuildingArt } from './BuildingArt';
import { ConstructionOverlay } from './ConstructionOverlay';

type BuildingHotspotProps = {
  building: CityViewBuilding;
  isSelected: boolean;
  showLabels: boolean;
  onSelect: (buildingType: string) => void;
  onTimerComplete: () => void;
};

function getArtVariant(building: CityViewBuilding): 'built' | 'site' | 'ghost' | 'construction' {
  if (building.visualState === 'upgrading') {
    return 'construction';
  }
  if (building.visualState === 'disabled') {
    return 'ghost';
  }
  if (building.level === 0) {
    return 'site';
  }
  return 'built';
}

function getStateCaption(building: CityViewBuilding): string | null {
  switch (building.visualState) {
    case 'not_built':
      return 'Not built';
    case 'disabled':
      return 'Coming later';
    default:
      return null;
  }
}

export function BuildingHotspot({
  building,
  isSelected,
  onSelect,
  onTimerComplete,
}: BuildingHotspotProps) {
  const [isHovered, setIsHovered] = useState(false);
  const [isFocused, setIsFocused] = useState(false);
  const { hotspot, visualState } = building;
  const caption = getStateCaption(building);
  const isLocked = visualState === 'disabled';
  const isRaised = isSelected || isHovered || isFocused;

  return (
    <button
      type="button"
      aria-label={`Open ${building.name} details, ${
        building.level > 0 ? `level ${building.level}` : 'not built'
      }`}
      aria-pressed={isSelected}
      onClick={() => onSelect(building.type)}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      onFocus={() => setIsFocused(true)}
      onBlur={() => setIsFocused(false)}
      className={`group absolute flex flex-col items-center justify-end rounded-xl transition-all duration-200 hover:-translate-y-1 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:ring-offset-transparent ${
        isSelected ? 'bg-secondary/15 ring-2 ring-secondary/90 shadow-[0_0_36px_rgba(200,138,61,0.32)]' : ''
      } ${
        isLocked ? 'cursor-not-allowed opacity-70 saturate-50' : 'cursor-pointer hover:bg-white/5'
      }`}
      style={{
        left: `${hotspot.x}%`,
        top: `${hotspot.y}%`,
        width: `${hotspot.width}%`,
        height: `${hotspot.height}%`,
        zIndex: isRaised ? 45 : hotspot.zIndex,
      }}
    >
      <span
        aria-hidden="true"
        className={`absolute inset-x-[12%] bottom-[12%] h-[28%] rounded-[50%] border transition-all duration-200 ${
          isSelected
            ? 'border-secondary/70 bg-secondary/15 opacity-100'
            : isLocked
              ? 'border-dashed border-muted/40 bg-surface/10 opacity-70'
              : 'border-primary/0 bg-primary/0 opacity-0 group-hover:border-primary/35 group-hover:bg-primary/10 group-hover:opacity-100'
        }`}
      />
      {/* illustration */}
      <span
        className={`relative block min-h-0 w-full flex-1 drop-shadow-md transition-all duration-200 group-hover:drop-shadow-xl ${
          isSelected ? 'drop-shadow-xl' : ''
        }`}
        style={{
          transform: hotspot.rotationDeg ? `rotate(${hotspot.rotationDeg}deg)` : undefined,
        }}
      >
        <BuildingArt buildingType={building.type} variant={getArtVariant(building)} />
        {visualState === 'upgrading' && building.upgradeFinishesAt ? (
          <ConstructionOverlay
            finishesAt={building.upgradeFinishesAt}
            onComplete={onTimerComplete}
          />
        ) : null}
      </span>

      {/* nameplate */}
      <span
        className="pointer-events-none relative z-50 mt-1 flex max-w-full items-center gap-1.5 rounded-full border border-[#d6b982] bg-[#fff8e9]/95 px-2.5 py-0.5 opacity-0 shadow-md transition-opacity group-hover:opacity-100 group-focus-visible:opacity-100"
      >
        <span className="truncate text-xs font-black text-[#2f2a24]">{building.name}</span>
        {building.level > 0 ? (
          <span className="whitespace-nowrap rounded-full bg-[#2f6f73]/15 px-1.5 text-[10px] font-black text-[#24585b]">
            Lv {building.level}
          </span>
        ) : null}
        {caption ? (
          <span className="whitespace-nowrap rounded-full bg-[#ead8b8] px-1.5 text-[10px] font-black uppercase tracking-wide text-[#6b5741]">
            {caption}
          </span>
        ) : null}
      </span>

      {/* state markers */}
      {visualState === 'upgrade_available' ? (
        <span
          aria-hidden="true"
          className="soft-pulse absolute right-[16%] top-[4%] flex h-5 w-5 items-center justify-center rounded-full border border-[#d6b982] bg-[#fff8e9]/95 text-[10px] font-black text-[#2f6f73] shadow-md"
        >
          ▲
        </span>
      ) : null}
      {isLocked ? (
        <span className="absolute left-[12%] top-0 rounded-full border border-[#d6b982] bg-[#fff8e9]/95 px-2 py-0.5 text-[10px] font-black uppercase text-[#6b5741] shadow-md">
          Locked
        </span>
      ) : null}
      {visualState === 'max_level' ? (
        <span className="absolute right-[12%] top-0 rounded-full bg-secondary px-2 py-0.5 text-[10px] font-bold uppercase text-white shadow-md ring-2 ring-surface">
          Max
        </span>
      ) : null}
    </button>
  );
}
