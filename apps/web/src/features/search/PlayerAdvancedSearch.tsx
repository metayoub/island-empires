import { useQuery } from '@tanstack/react-query';
import { useMemo, useState } from 'react';
import { ErrorState, LoadingState } from '../../components/ui';
import { FilterInput, SearchFilterPanel } from './SearchFilterPanel';
import { SearchResultsTable } from './SearchResultsTable';
import { searchPlayers } from './search.api';

export function PlayerAdvancedSearch() {
  const [filters, setFilters] = useState({ name: '', allianceTag: '', minScore: '', minCities: '' });
  const [submitted, setSubmitted] = useState(filters);
  const params = useMemo(() => toParams(submitted), [submitted]);
  const query = useQuery({ queryKey: ['advanced-search', 'players', params.toString()], queryFn: () => searchPlayers(params) });

  return (
    <section className="space-y-4">
      <SearchFilterPanel onSubmit={() => setSubmitted(filters)} isLoading={query.isLoading}>
        <FilterInput label="Player name" value={filters.name} onChange={(name) => setFilters({ ...filters, name })} />
        <FilterInput label="Alliance tag" value={filters.allianceTag} onChange={(allianceTag) => setFilters({ ...filters, allianceTag })} />
        <FilterInput label="Minimum score" type="number" value={filters.minScore} onChange={(minScore) => setFilters({ ...filters, minScore })} />
        <FilterInput label="Minimum cities" type="number" value={filters.minCities} onChange={(minCities) => setFilters({ ...filters, minCities })} />
      </SearchFilterPanel>
      {query.isLoading ? <LoadingState message="Searching players..." /> : null}
      {query.isError ? <ErrorState title="Player search failed" message={(query.error as Error).message} /> : null}
      {query.data ? (
        <SearchResultsTable
          results={query.data.results}
          columns={[
            { key: 'rank', label: 'Rank', render: (row) => `#${row.rank}` },
            { key: 'name', label: 'Player', render: (row) => row.playerName },
            { key: 'alliance', label: 'Alliance', render: (row) => row.alliance?.tag ?? 'None' },
            { key: 'score', label: 'Score', render: (row) => row.score.toLocaleString() },
            { key: 'cities', label: 'Cities', render: (row) => row.cityCount },
          ]}
        />
      ) : null}
    </section>
  );
}

function toParams(values: Record<string, string>) {
  const params = new URLSearchParams({ pageSize: '50' });
  Object.entries(values).forEach(([key, value]) => {
    if (value) params.set(key, value);
  });
  return params;
}
