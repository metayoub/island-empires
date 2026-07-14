import { useQuery } from '@tanstack/react-query';
import { useState } from 'react';
import type { PlayerRankingType } from '@island-empires/shared-types';
import { ErrorState, LoadingState } from '../../components/ui';
import { getPlayerRankings } from './rankings.api';
import { RankingTable } from './RankingTable';
import { RankingTypeTabs } from './RankingTypeTabs';

const PLAYER_TYPES: Array<{ id: PlayerRankingType; label: string }> = [
  { id: 'overall', label: 'Overall' },
  { id: 'gold', label: 'Gold' },
  { id: 'army', label: 'Army' },
  { id: 'research', label: 'Research' },
  { id: 'cities', label: 'Cities' },
];

export function PlayerRankingsTab() {
  const [type, setType] = useState<PlayerRankingType>('overall');
  const query = useQuery({
    queryKey: ['rankings', 'players', type],
    queryFn: () => getPlayerRankings(type),
  });

  return (
    <section className="space-y-4">
      <RankingTypeTabs options={PLAYER_TYPES} value={type} onChange={setType} />
      {query.isLoading ? <LoadingState message="Loading player rankings..." /> : null}
      {query.isError ? <ErrorState title="Unable to load player rankings" message={(query.error as Error).message} /> : null}
      {query.data ? <RankingTable rows={query.data.rankings} mode="players" /> : null}
    </section>
  );
}
