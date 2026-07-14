import { describe, expect, it } from 'vitest';
import { CITY_LAYOUT } from './city-layout.config';

const EXPECTED_BUILDING_TYPES = [
  'academy',
  'barracks',
  'builders_guild',
  'city_hall',
  'crystal_lensworks',
  'foresters_house',
  'governor_residency',
  'hospital',
  'luxury_extractor',
  'marble_mason',
  'marketplace',
  'palace',
  'port',
  'shipyard',
  'spy_agency',
  'sulfur_refinery',
  'tavern',
  'trading_post',
  'vineyard_estate',
  'wall',
  'warehouse',
  'workshop',
];

describe('CITY_LAYOUT', () => {
  it('contains exactly one hotspot per supported building', () => {
    const types = CITY_LAYOUT.hotspots.map((hotspot) => hotspot.buildingType).sort();

    expect(types).toEqual(EXPECTED_BUILDING_TYPES);
  });

  it('keeps every hotspot and empty slot inside the scene bounds', () => {
    const zones = [...CITY_LAYOUT.hotspots, ...CITY_LAYOUT.emptySlots];

    for (const zone of zones) {
      expect(zone.x).toBeGreaterThanOrEqual(0);
      expect(zone.y).toBeGreaterThanOrEqual(0);
      expect(zone.x + zone.width).toBeLessThanOrEqual(100);
      expect(zone.y + zone.height).toBeLessThanOrEqual(100);
    }
  });

  it('keeps every zIndex below the modal overlay (z-50)', () => {
    const zones = [...CITY_LAYOUT.hotspots, ...CITY_LAYOUT.emptySlots];

    for (const zone of zones) {
      expect(zone.zIndex).toBeLessThan(50);
    }
  });
});
