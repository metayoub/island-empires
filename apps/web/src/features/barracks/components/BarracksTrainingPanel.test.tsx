import { screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { BarracksOverviewResponse, TrainUnitsResponse } from '@island-empires/shared-types';
import { renderWithProviders, setSelectedCity } from '../../../test/renderWithProviders';
import { getBarracksOverview, trainUnits } from '../barracks.api';
import { BarracksTrainingPanel } from './BarracksTrainingPanel';

vi.mock('../barracks.api', () => ({
  getBarracksOverview: vi.fn(),
  trainUnits: vi.fn(),
}));

function buildOverview(overrides: Partial<BarracksOverviewResponse> = {}): BarracksOverviewResponse {
  return {
    cityId: 'city-1',
    cityName: 'New Haven',
    barracksLevel: 1,
    maxQuantityPerOrder: 25,
    resources: {
      wood: 500,
      gold: 300,
      marble: 0,
      wine: 0,
      crystal: 0,
      sulfur: 0,
      lastCalculatedAt: '2026-01-01T00:00:00.000Z',
    },
    units: [
      {
        type: 'spearman',
        name: 'Spearman',
        description: 'Basic defensive infantry.',
        cost: { wood: 40, gold: 20 },
        trainingSecondsPerUnit: 30,
        attack: 5,
        defense: 8,
        health: 10,
        canTrain: true,
        disabledReason: null,
        maxAffordable: 12,
      },
      {
        type: 'archer',
        name: 'Archer',
        description: 'Ranged support unit.',
        cost: { wood: 60, gold: 30 },
        trainingSecondsPerUnit: 45,
        attack: 9,
        defense: 4,
        health: 8,
        canTrain: true,
        disabledReason: null,
        maxAffordable: 8,
      },
      {
        type: 'swordsman',
        name: 'Swordsman',
        description: 'Stronger attack infantry.',
        cost: { wood: 80, gold: 50 },
        trainingSecondsPerUnit: 60,
        attack: 12,
        defense: 8,
        health: 12,
        canTrain: true,
        disabledReason: null,
        maxAffordable: 6,
      },
    ],
    army: { spearman: 3, archer: 0, swordsman: 1 },
    activeTraining: null,
    ...overrides,
  };
}

describe('BarracksTrainingPanel', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    setSelectedCity('city-1');
    vi.mocked(getBarracksOverview).mockResolvedValue(buildOverview());
    vi.mocked(trainUnits).mockResolvedValue({} as TrainUnitsResponse);
  });

  it('shows the army and all trainable units with their costs', async () => {
    renderWithProviders(<BarracksTrainingPanel />);

    expect(await screen.findByRole('button', { name: 'Train Spearman' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Train Archer' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Train Swordsman' })).toBeInTheDocument();
    expect(screen.getAllByText(/40 wood · 20 gold/)).toHaveLength(2);
    expect(screen.getByText('Your army')).toBeInTheDocument();
    expect(screen.getAllByText('Spearman')).toHaveLength(2);
  });

  it('starts training with the chosen quantity', async () => {
    const user = userEvent.setup();
    renderWithProviders(<BarracksTrainingPanel />);

    const quantityInput = await screen.findByLabelText('Spearman quantity');
    await user.clear(quantityInput);
    await user.type(quantityInput, '5');
    await user.click(screen.getByRole('button', { name: 'Train Spearman' }));

    expect(trainUnits).toHaveBeenCalledWith('city-1', { unitType: 'spearman', quantity: 5 });
  });

  it('shows the active training order and disables training', async () => {
    vi.mocked(getBarracksOverview).mockResolvedValue(
      buildOverview({
        activeTraining: {
          id: 'order-1',
          unitType: 'spearman',
          unitName: 'Spearman',
          quantity: 5,
          startedAt: '2026-01-01T00:00:00.000Z',
          finishesAt: '2100-01-01T00:00:00.000Z',
          remainingSeconds: 120,
        },
      }),
    );

    renderWithProviders(<BarracksTrainingPanel />);

    expect(await screen.findByText('Training 5 × Spearman')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Train Spearman' })).toBeDisabled();
  });
});
