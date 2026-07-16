import type { CityLayoutConfig } from './city-view.types';

// Hotspot positions are percentages of the scene box so the layout scales with
// the container. Keep every zIndex below 50 (the Modal overlay uses z-50).
export const CITY_LAYOUT: CityLayoutConfig = {
  aspectRatio: '3 / 2',
  hotspots: [
    { buildingType: 'city_hall', x: 47, y: 18, width: 10, height: 12, zIndex: 32 },
    { buildingType: 'academy', x: 70, y: 15, width: 10, height: 12, zIndex: 24 },
    { buildingType: 'warehouse', x: 24, y: 23, width: 10, height: 12, zIndex: 24 },
    { buildingType: 'barracks', x: 25, y: 33, width: 10, height: 12, zIndex: 24 },
    { buildingType: 'port', x: 35, y: 40, width: 10, height: 12, zIndex: 26 },
    { buildingType: 'tavern', x: 46, y: 10, width: 10, height: 12, zIndex: 24 },
    { buildingType: 'luxury_extractor', x: 56, y: 20, width: 10, height: 12, zIndex: 24 },
    { buildingType: 'marketplace', x: 55, y: 34, width: 10, height: 12, zIndex: 24 },
    { buildingType: 'foresters_house', x: 47, y: 33, width: 10, height: 12, zIndex: 24 },
    { buildingType: 'marble_mason', x: 52, y: 27, width: 10, height: 12, zIndex: 25 },
    { buildingType: 'vineyard_estate', x: 52, y: 27, width: 10, height: 12, zIndex: 25 },
    { buildingType: 'crystal_lensworks', x: 52, y: 27, width: 10, height: 12, zIndex: 25 },
    { buildingType: 'sulfur_refinery', x: 52, y: 27, width: 10, height: 12, zIndex: 25 },
    { buildingType: 'spy_agency', x: 61, y: 25, width: 10, height: 12, zIndex: 24 },
    { buildingType: 'hospital', x: 29, y: 47, width: 10, height: 12, zIndex: 24 },
    { buildingType: 'shipyard', x: 17, y: 67, width: 11, height: 11, zIndex: 28 },
    { buildingType: 'builders_guild', x: 41, y: 12, width: 10, height: 12, zIndex: 25 },
    { buildingType: 'workshop', x: 35, y: 28, width: 10, height: 11, zIndex: 25 },
    { buildingType: 'palace', x: 38, y: 20, width: 12, height: 13, zIndex: 26 },
    { buildingType: 'governor_residency', x: 38, y: 20, width: 12, height: 13, zIndex: 26 },
    { buildingType: 'wall', x: 26, y: 8.5, width: 18, height: 13, zIndex: 17, rotationDeg: -25 },
    { buildingType: 'trading_post', x: 66, y: 35, width: 10, height: 12, zIndex: 24 },
  ],
  emptySlots: [{ id: 'site-6', x: 31, y: 16, width: 8, height: 9, zIndex: 16 }],
  districts: [
    { id: 'civic', label: 'Civic Core', x: 48, y: 14 },
    { id: 'harbor', label: 'Harbor Road', x: 27, y: 62 },
    { id: 'trade', label: 'Trade Quarter', x: 80, y: 45 },
    { id: 'defense', label: 'Outer Wall', x: 27, y: 11 },
    { id: 'academy', label: 'Academy Hill', x: 73, y: 12 },
  ],
};
