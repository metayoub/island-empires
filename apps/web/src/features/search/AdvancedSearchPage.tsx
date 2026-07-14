import { useState } from 'react';
import { EmptyState } from '../../components/ui';
import { AllianceAdvancedSearch } from './AllianceAdvancedSearch';
import { CityAdvancedSearch } from './CityAdvancedSearch';
import { MarketplaceAdvancedSearch } from './MarketplaceAdvancedSearch';
import { PlayerAdvancedSearch } from './PlayerAdvancedSearch';

type SearchTab = 'players' | 'cities' | 'alliances' | 'islands' | 'marketplace';

const TABS: Array<{ id: SearchTab; label: string }> = [
  { id: 'players', label: 'Players' },
  { id: 'cities', label: 'Cities' },
  { id: 'alliances', label: 'Alliances' },
  { id: 'islands', label: 'Islands' },
  { id: 'marketplace', label: 'Marketplace' },
];

export function AdvancedSearchPage() {
  const [tab, setTab] = useState<SearchTab>('players');

  return (
    <main className="mx-auto w-full max-w-6xl space-y-4">
      <div className="game-surface game-frame rounded-lg p-4">
        <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
          <div>
            <h1 className="text-2xl font-black text-text">Advanced Search</h1>
            <p className="text-sm font-semibold text-muted">Find public players, cities, alliances, and trade offers with precise filters.</p>
          </div>
          <div role="tablist" className="flex flex-wrap gap-2">
            {TABS.map((item) => (
              <button
                key={item.id}
                type="button"
                role="tab"
                aria-selected={tab === item.id}
                onClick={() => setTab(item.id)}
                className={`rounded-md border px-3 py-2 text-sm font-bold ${
                  tab === item.id
                    ? 'border-primary bg-primary text-white'
                    : 'border-border bg-surface text-muted hover:text-text'
                }`}
              >
                {item.label}
              </button>
            ))}
          </div>
        </div>
      </div>
      {tab === 'players' ? <PlayerAdvancedSearch /> : null}
      {tab === 'cities' ? <CityAdvancedSearch /> : null}
      {tab === 'alliances' ? <AllianceAdvancedSearch /> : null}
      {tab === 'marketplace' ? <MarketplaceAdvancedSearch /> : null}
      {tab === 'islands' ? (
        <EmptyState title="Use World Map filters" description="Island exploration stays on the World Map until the island index endpoint is added." />
      ) : null}
    </main>
  );
}
