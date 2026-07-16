import { screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { AttackPveCampResponse, PveCampDetailResponse } from '@island-empires/shared-types';
import { renderWithProviders } from '../../../test/renderWithProviders';
import { attackPveCamp, getPveCampDetail } from '../pve.api';
import { PveCampDetailPanel } from './PveCampDetailPanel';

vi.mock('../pve.api', () => ({
  getPveCampDetail: vi.fn(),
  attackPveCamp: vi.fn(),
}));

function buildDetail(overrides: Partial<PveCampDetailResponse> = {}): PveCampDetailResponse {
  return {
    camp: {
      id: 'camp-1',
      name: 'Barbarian Village North',
      level: 1,
      slotIndex: 11,
      island: { id: 'island-1', name: 'Fisher Crown', x: 388, y: 438 },
      enemyStrength: 40,
      strengthLabel: 'Low',
      rewards: { wood: 500, gold: 250, marble: 0, wine: 0, crystal: 0, sulfur: 0 },
      distanceFromSelectedCity: 120,
      travelTimeSeconds: 480,
    },
    originCity: { id: 'city-1', name: 'New Haven' },
    army: { spearman: 10, archer: 2, swordsman: 0 },
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
      },
    ],
    attack: { canAttack: true, disabledReason: null },
    ...overrides,
  };
}

describe('PveCampDetailPanel', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(getPveCampDetail).mockResolvedValue(buildDetail());
    vi.mocked(attackPveCamp).mockResolvedValue({} as AttackPveCampResponse);
  });

  it('shows camp level, enemy strength, rewards, and travel time', async () => {
    renderWithProviders(<PveCampDetailPanel campId="camp-1" onClose={() => undefined} />);

    expect(await screen.findByText('Barbarian Village North')).toBeInTheDocument();
    expect(screen.getByText('Level 1 Barbarian Village · Fisher Crown')).toBeInTheDocument();
    expect(screen.getByText('40')).toBeInTheDocument();
    expect(screen.getByText('500 wood · 250 gold')).toBeInTheDocument();
    expect(screen.getByText('8m')).toBeInTheDocument();
    expect(screen.getByText('Low threat')).toBeInTheDocument();
  });

  it('keeps the attack button disabled until units are selected', async () => {
    renderWithProviders(<PveCampDetailPanel campId="camp-1" onClose={() => undefined} />);

    const attackButton = await screen.findByRole('button', { name: 'Attack Village' });
    expect(attackButton).toBeDisabled();

    const spearmanInput = screen.getByLabelText('Spearman to send');
    await userEvent.setup().type(spearmanInput, '8');

    expect(attackButton).toBeEnabled();
  });

  it('confirms an attack and sends the selected units', async () => {
    const user = userEvent.setup();
    renderWithProviders(<PveCampDetailPanel campId="camp-1" onClose={() => undefined} />);

    const spearmanInput = await screen.findByLabelText('Spearman to send');
    await user.clear(spearmanInput);
    await user.type(spearmanInput, '8');
    await user.click(screen.getByRole('button', { name: 'Attack Village' }));

    const dialog = await screen.findByRole('dialog');
    expect(within(dialog).getByText('8 Spearman')).toBeInTheDocument();
    expect(within(dialog).getByText('40 vs 40')).toBeInTheDocument();

    await user.click(within(dialog).getByRole('button', { name: 'Confirm attack' }));

    expect(attackPveCamp).toHaveBeenCalledWith('camp-1', {
      originCityId: 'city-1',
      units: { spearman: 8 },
    });
  });

  it('warns the player when no units are available', async () => {
    vi.mocked(getPveCampDetail).mockResolvedValue(
      buildDetail({
        army: { spearman: 0, archer: 0, swordsman: 0 },
        attack: { canAttack: false, disabledReason: 'NO_UNITS_SELECTED' },
      }),
    );

    renderWithProviders(<PveCampDetailPanel campId="camp-1" onClose={() => undefined} />);

    expect(
      await screen.findByText(
        'You have no trained land units. Train troops in the Barracks first.',
      ),
    ).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Attack Village' })).toBeDisabled();
  });
});
