import type {
  CityBuildingSummary,
  CityOverview,
  StartBuildingUpgradeResponse,
} from '@island-empires/shared-types';
import { screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { renderWithProviders, setSelectedCity } from '../../test/renderWithProviders';
import { getCityOverview, startBuildingUpgrade } from '../city/city.api';
import { triggerCityBuildingClicked } from './city-view.api';
import { CityViewPage } from './CityViewPage';

vi.mock('../city/city.api', () => ({
  getCityOverview: vi.fn(),
  startBuildingUpgrade: vi.fn(),
}));

vi.mock('./city-view.api', () => ({
  triggerCityBuildingClicked: vi.fn(),
}));

const NOW_ISO = '2026-01-01T00:00:00.000Z';

function buildBuilding(overrides: Partial<CityBuildingSummary>): CityBuildingSummary {
  return {
    id: `building-${overrides.type ?? 'unknown'}`,
    type: 'warehouse',
    name: 'Warehouse',
    level: 1,
    slotIndex: 0,
    status: 'idle',
    description: 'Placeholder description.',
    canUpgrade: true,
    upgradeCost: { wood: 100, gold: 40, marble: 0, wine: 0, crystal: 0, sulfur: 0 },
    upgradeDurationSeconds: 45,
    upgradeStartedAt: null,
    upgradeFinishesAt: null,
    ...overrides,
  };
}

function buildOverview(overrides: Partial<CityOverview> = {}): CityOverview {
  return {
    city: {
      id: 'city-1',
      name: 'New Haven',
      level: 2,
      population: 60,
      populationCapacity: 150,
      happiness: 105,
    },
    population: {
      current: 60,
      capacity: 150,
      growthPerHour: 2,
      isAtCapacity: false,
      lastCalculatedAt: NOW_ISO,
    },
    happiness: {
      value: 105,
      base: 100,
      tavernBonus: 10,
      healthSupport: 0,
      healthPressureRelief: 0,
      healthGrowthBonusPercent: 0,
      populationPressure: 5,
      administrationPenalty: 0,
      status: 'happy',
    },
    citizens: {
      woodWorkers: 10,
      goldWorkers: 5,
      luxuryWorkers: 0,
      scientists: 2,
      idleCitizens: 43,
    },
    resources: {
      wood: 1000,
      gold: 500,
      marble: 0,
      wine: 0,
      crystal: 0,
      sulfur: 0,
      lastCalculatedAt: NOW_ISO,
    },
    production: {
      woodPerHour: 80,
      goldPerHour: 35,
      marblePerHour: 0,
      winePerHour: 0,
      crystalPerHour: 0,
      sulfurPerHour: 0,
    },
    storage: { capacityPerResource: 5000, fullResources: [] },
    research: { researchPoints: 10, researchPointsPerHour: 8, activeResearch: null },
    workers: { woodWorkers: 10, goldWorkers: 5, luxuryWorkers: 0, scientists: 2, idleCitizens: 43 },
    buildings: [
      buildBuilding({ type: 'city_hall', name: 'City Hall', level: 2, slotIndex: 0 }),
      buildBuilding({
        type: 'warehouse',
        name: 'Warehouse',
        level: 2,
        slotIndex: 1,
        upgradeCost: { wood: 225, gold: 90, marble: 0, wine: 0, crystal: 0, sulfur: 0 },
        upgradeDurationSeconds: 88,
      }),
      buildBuilding({ type: 'academy', name: 'Academy', level: 0, slotIndex: 2 }),
      buildBuilding({ type: 'tavern', name: 'Tavern', level: 1, slotIndex: 3 }),
      buildBuilding({
        type: 'luxury_extractor',
        name: 'Luxury Extractor',
        level: 0,
        slotIndex: 6,
        canUpgrade: true,
        upgradeCost: { wood: 160, gold: 80, marble: 0, wine: 0, crystal: 0, sulfur: 0 },
        upgradeDurationSeconds: 100,
      }),
      buildBuilding({
        type: 'barracks',
        name: 'Barracks',
        level: 0,
        slotIndex: 4,
        canUpgrade: false,
        disabledReason: 'Available in future sprint',
        upgradeCost: undefined,
        upgradeDurationSeconds: undefined,
      }),
      buildBuilding({
        type: 'port',
        name: 'Port',
        level: 0,
        slotIndex: 5,
        canUpgrade: true,
        upgradeCost: { wood: 180, gold: 100, marble: 0, wine: 0, crystal: 0, sulfur: 0 },
        upgradeDurationSeconds: 120,
      }),
      buildBuilding({
        type: 'wall',
        name: 'Town Wall',
        level: 0,
        slotIndex: 7,
        canUpgrade: true,
        upgradeCost: { wood: 180, gold: 80, marble: 0, wine: 0, crystal: 0, sulfur: 0 },
        upgradeDurationSeconds: 90,
      }),
    ],
    activeConstruction: null,
    ...overrides,
  };
}

describe('CityViewPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    setSelectedCity('city-1');
    vi.mocked(getCityOverview).mockResolvedValue(buildOverview());
    vi.mocked(startBuildingUpgrade).mockResolvedValue({} as StartBuildingUpgradeResponse);
    vi.mocked(triggerCityBuildingClicked).mockResolvedValue({ currentQuest: null, quests: [] });
  });

  it('renders a hotspot for every supported building', async () => {
    renderWithProviders(<CityViewPage />);

    expect(
      await screen.findByRole('button', { name: 'Open City Hall details, level 2' }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole('button', { name: 'Open Warehouse details, level 2' }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole('button', { name: 'Open Academy details, not built' }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole('button', { name: 'Open Tavern details, level 1' }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole('button', { name: 'Open Barracks details, not built' }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole('button', { name: 'Open Port details, not built' }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole('button', { name: 'Open Luxury Extractor details, not built' }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole('button', { name: 'Open Town Wall details, not built' }),
    ).toBeInTheDocument();
  });

  it('opens the detail panel and fires the quest trigger when a building is clicked', async () => {
    renderWithProviders(<CityViewPage />);

    await userEvent.click(
      await screen.findByRole('button', { name: 'Open Warehouse details, level 2' }),
    );

    const dialog = await screen.findByRole('dialog');
    expect(within(dialog).getByText('Warehouse — Level 2')).toBeInTheDocument();
    expect(within(dialog).getByText('225')).toBeInTheDocument();
    expect(within(dialog).getByText('1m 28s')).toBeInTheDocument();
    expect(triggerCityBuildingClicked).toHaveBeenCalledWith('warehouse');
  });

  it('starts an upgrade through the existing endpoint', async () => {
    renderWithProviders(<CityViewPage />);

    await userEvent.click(
      await screen.findByRole('button', { name: 'Open Warehouse details, level 2' }),
    );
    const dialog = await screen.findByRole('dialog');
    await userEvent.click(within(dialog).getByRole('button', { name: 'Upgrade' }));

    expect(startBuildingUpgrade).toHaveBeenCalledWith('city-1', 'warehouse');
  });

  it('shows the construction overlay and blocks other upgrades while the queue is busy', async () => {
    const finishesAt = new Date(Date.now() + 60_000).toISOString();
    const overview = buildOverview({ activeConstruction: null });
    overview.buildings = overview.buildings.map((building) => {
      if (building.type === 'city_hall') {
        return {
          ...building,
          status: 'upgrading',
          canUpgrade: false,
          disabledReason: 'Upgrading...',
          upgradeFinishesAt: finishesAt,
        };
      }
      if (building.type === 'warehouse') {
        return { ...building, canUpgrade: false, disabledReason: 'Construction busy' };
      }
      return building;
    });
    overview.activeConstruction = {
      buildingId: 'building-city_hall',
      buildingType: 'city_hall',
      buildingName: 'City Hall',
      fromLevel: 2,
      toLevel: 3,
      startedAt: NOW_ISO,
      finishesAt,
      remainingSeconds: 60,
    };
    vi.mocked(getCityOverview).mockResolvedValue(overview);

    renderWithProviders(<CityViewPage />);

    expect((await screen.findAllByText('🔨')).length).toBeGreaterThan(0);

    await userEvent.click(screen.getByRole('button', { name: 'Open Warehouse details, level 2' }));
    const dialog = await screen.findByRole('dialog');
    const upgradeButton = within(dialog).getByRole('button', { name: 'Construction busy' });
    expect(upgradeButton).toBeDisabled();
  });

  it('shows buildable transport details for the port', async () => {
    renderWithProviders(<CityViewPage />);

    await userEvent.click(
      await screen.findByRole('button', { name: 'Open Port details, not built' }),
    );

    const dialog = await screen.findByRole('dialog');
    expect(within(dialog).getByText('Trade ships')).toBeInTheDocument();
    expect(within(dialog).getByText('Build this to unlock transport.')).toBeInTheDocument();
    expect(within(dialog).getByRole('button', { name: 'Build' })).toBeEnabled();
  });

  it('shows an error state when the overview cannot be loaded', async () => {
    vi.mocked(getCityOverview).mockRejectedValue(new Error('boom'));

    renderWithProviders(<CityViewPage />);

    expect(
      await screen.findByText('Unable to load your city view.', undefined, { timeout: 4000 }),
    ).toBeInTheDocument();
  });
});
