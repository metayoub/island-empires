import type { AllianceRankingRow, PlayerRankingRow } from '@island-empires/shared-types';
import { Card, EmptyState } from '../../components/ui';

type RankingTableProps = {
  rows: Array<PlayerRankingRow | AllianceRankingRow>;
  mode: 'players' | 'alliances';
};

export function RankingTable({ rows, mode }: RankingTableProps) {
  if (rows.length === 0) {
    return <EmptyState title="No rankings yet" description="Rankings will appear as beta worlds fill with activity." />;
  }

  return (
    <Card className="overflow-hidden p-0">
      <div className="grid grid-cols-[64px_1.6fr_1fr_1fr] border-b border-border bg-surface-strong px-4 py-2 text-xs font-black uppercase text-muted">
        <span>Rank</span>
        <span>{mode === 'players' ? 'Player' : 'Alliance'}</span>
        <span>{mode === 'players' ? 'Alliance' : 'Members'}</span>
        <span className="text-right">Score</span>
      </div>
      {rows.map((row) => {
        const isPlayer = 'playerId' in row;
        return (
          <div
            key={isPlayer ? row.playerId : row.allianceId}
            className="grid grid-cols-[64px_1.6fr_1fr_1fr] items-center border-b border-border/70 px-4 py-3 text-sm last:border-b-0"
          >
            <span className="font-black text-primary">#{row.rank}</span>
            <span className="min-w-0">
              <span className="block truncate font-black text-text">{isPlayer ? row.playerName : row.name}</span>
              <span className="text-xs font-semibold text-muted">
                {isPlayer ? `${row.cityCount} cities` : row.tag}
              </span>
            </span>
            <span className="truncate font-semibold text-muted">
              {isPlayer ? row.alliance?.tag ?? 'No alliance' : row.memberCount.toLocaleString()}
            </span>
            <span className="text-right font-black text-text">{row.score.toLocaleString()}</span>
          </div>
        );
      })}
    </Card>
  );
}
