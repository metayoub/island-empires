import { useState } from 'react';
import { AllianceRankingsTab } from './AllianceRankingsTab';
import { PlayerRankingsTab } from './PlayerRankingsTab';
import type { RankingScope } from './ranking.types';

export function RankingsPage() {
  const [scope, setScope] = useState<RankingScope>('players');

  return (
    <main className="mx-auto w-full max-w-6xl space-y-4">
      <div className="game-surface game-frame rounded-lg p-4">
        <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
          <div>
            <h1 className="text-2xl font-black text-text">Rankings</h1>
            <p className="text-sm font-semibold text-muted">Compare aggregate progress without exposing private city details.</p>
          </div>
          <div role="tablist" className="flex gap-2">
            {[
              ['players', 'Players'],
              ['alliances', 'Alliances'],
            ].map(([id, label]) => (
              <button
                key={id}
                type="button"
                role="tab"
                aria-selected={scope === id}
                onClick={() => setScope(id as RankingScope)}
                className={`rounded-md border px-4 py-2 text-sm font-black ${
                  scope === id
                    ? 'border-primary bg-primary text-white'
                    : 'border-border bg-surface text-muted hover:text-text'
                }`}
              >
                {label}
              </button>
            ))}
          </div>
        </div>
      </div>
      {scope === 'players' ? <PlayerRankingsTab /> : <AllianceRankingsTab />}
    </main>
  );
}
