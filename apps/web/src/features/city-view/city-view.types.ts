import type { CityBuildingHotspot } from '@island-empires/shared-types';

export type EmptySlotConfig = {
  id: string;
  label?: string;
  image?: 'ground' | 'governor_residency' | 'wall';
  x: number;
  y: number;
  width: number;
  height: number;
  zIndex: number;
};

export type CityLayoutConfig = {
  aspectRatio: string;
  hotspots: CityBuildingHotspot[];
  emptySlots: EmptySlotConfig[];
  districts?: Array<{
    id: string;
    label: string;
    x: number;
    y: number;
  }>;
};

export type UpgradeButtonState = {
  label: string;
  disabled: boolean;
};
