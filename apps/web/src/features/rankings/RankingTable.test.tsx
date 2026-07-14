import { screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { renderWithProviders } from '../../test/renderWithProviders';
import { RankingTable } from './RankingTable';

describe('RankingTable', () => {
  it('renders aggregate player rows', () => {
    renderWithProviders(
      <RankingTable
        mode="players"
        rows={[
          {
            rank: 1,
            playerId: 'player-1',
            playerName: 'Founder',
            alliance: { id: 'alliance-1', name: 'Sea Wolves', tag: 'SEA' },
            score: 125000,
            cityCount: 3,
          },
        ]}
      />,
    );

    expect(screen.getByText('Founder')).toBeInTheDocument();
    expect(screen.getByText('SEA')).toBeInTheDocument();
    expect(screen.getByText('125,000')).toBeInTheDocument();
  });

  it('renders an empty state', () => {
    renderWithProviders(<RankingTable mode="alliances" rows={[]} />);

    expect(screen.getByText('No rankings yet')).toBeInTheDocument();
  });
});
