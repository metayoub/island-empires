import { useQuery } from '@tanstack/react-query';
import { useState } from 'react';
import type { AllianceRankingType } from '@island-empires/shared-types';
import { ErrorState, LoadingState } from '../../components/ui';
import { getAllianceRankings } from './rankings.api';
import { RankingTable } from './RankingTable';
import { RankingTypeTabs } from './RankingTypeTabs';

const ALLIANCE_TYPES: Array<{ id: AllianceRankingType; label: string }> = [
  { id: 'overall', label: 'Overall' },
  { id: 'gold', label: 'Gold' },
  { id: 'army', label: 'Army' },
  { id: 'research', label: 'Research' },
  { id: 'members', label: 'Members' },
  { id: 'projects', label: 'Projects' },
];

export function AllianceRankingsTab() {
  const [type, setType] = useState<AllianceRankingType>('overall');
  const query = useQuery({
    queryKey: ['rankings', 'alliances', type],
    queryFn: () => getAllianceRankings(type),
  });

  return (
    <section className="space-y-4">
      <RankingTypeTabs options={ALLIANCE_TYPES} value={type} onChange={setType} />
      {query.isLoading ? <LoadingState message="Loading alliance rankings..." /> : null}
      {query.isError ? <ErrorState title="Unable to load alliance rankings" message={(query.error as Error).message} /> : null}
      {query.data ? <RankingTable rows={query.data.rankings} mode="alliances" /> : null}
    </section>
  );
}
