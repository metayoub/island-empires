import type { CityViewBuilding } from '@island-empires/shared-types';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { BuildingHotspot } from './BuildingHotspot';

function buildViewBuilding(overrides: Partial<CityViewBuilding> = {}): CityViewBuilding {
  return {
    id: 'building-warehouse',
    type: 'warehouse',
    name: 'Warehouse',
    level: 2,
    slotIndex: 1,
    status: 'idle',
    description: 'Stores and protects your city resources.',
    canUpgrade: true,
    upgradeCost: { wood: 225, gold: 90, marble: 0, wine: 0, crystal: 0, sulfur: 0 },
    upgradeDurationSeconds: 88,
    upgradeStartedAt: null,
    upgradeFinishesAt: null,
    visualState: 'upgrade_available',
    hotspot: { buildingType: 'warehouse', x: 12, y: 44, width: 18, height: 18, zIndex: 25 },
    effects: [{ label: 'Storage capacity', current: '5,000 per resource' }],
    ...overrides,
  };
}

const NOOP_PROPS = {
  isSelected: false,
  showLabels: true,
  onTimerComplete: () => undefined,
};

describe('BuildingHotspot', () => {
  it('renders an accessible button with the level badge', () => {
    render(<BuildingHotspot building={buildViewBuilding()} onSelect={() => undefined} {...NOOP_PROPS} />);

    expect(
      screen.getByRole('button', { name: 'Open Warehouse details, level 2' }),
    ).toBeInTheDocument();
    expect(screen.getByText('Lv 2')).toBeInTheDocument();
  });

  it('calls onSelect with the building type when clicked', async () => {
    const onSelect = vi.fn();
    render(<BuildingHotspot building={buildViewBuilding()} onSelect={onSelect} {...NOOP_PROPS} />);

    await userEvent.click(screen.getByRole('button', { name: /Open Warehouse details/ }));

    expect(onSelect).toHaveBeenCalledWith('warehouse');
  });

  it('shows the not-built state for level 0 buildings', () => {
    render(
      <BuildingHotspot
        building={buildViewBuilding({
          type: 'academy',
          name: 'Academy',
          level: 0,
          visualState: 'not_built',
          hotspot: { buildingType: 'academy', x: 62, y: 14, width: 18, height: 16, zIndex: 20 },
        })}
        onSelect={() => undefined}
        {...NOOP_PROPS}
      />,
    );

    expect(
      screen.getByRole('button', { name: 'Open Academy details, not built' }),
    ).toBeInTheDocument();
    expect(screen.getByText('Not built')).toBeInTheDocument();
    expect(screen.queryByText(/^Lv /)).not.toBeInTheDocument();
  });

  it('shows the coming-later state for future buildings', () => {
    render(
      <BuildingHotspot
        building={buildViewBuilding({
          type: 'port',
          name: 'Port',
          level: 0,
          canUpgrade: false,
          visualState: 'disabled',
          hotspot: { buildingType: 'port', x: 42, y: 68, width: 22, height: 18, zIndex: 35 },
        })}
        onSelect={() => undefined}
        {...NOOP_PROPS}
      />,
    );

    expect(screen.getByText('Coming later')).toBeInTheDocument();
  });

  it('renders the construction overlay while upgrading', () => {
    render(
      <BuildingHotspot
        building={buildViewBuilding({
          status: 'upgrading',
          visualState: 'upgrading',
          upgradeFinishesAt: new Date(Date.now() + 60_000).toISOString(),
        })}
        onSelect={() => undefined}
        {...NOOP_PROPS}
      />,
    );

    expect(screen.getByText('🔨')).toBeInTheDocument();
  });
});
