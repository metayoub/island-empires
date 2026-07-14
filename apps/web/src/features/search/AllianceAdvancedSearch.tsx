import { useQuery } from '@tanstack/react-query';
import { useMemo, useState } from 'react';
import { ErrorState, LoadingState } from '../../components/ui';
import { FilterInput, SearchFilterPanel } from './SearchFilterPanel';
import { SearchResultsTable } from './SearchResultsTable';
import { searchAlliances } from './search.api';

export function AllianceAdvancedSearch() {
  const [filters, setFilters] = useState({ name: '', tag: '', minMembers: '', minScore: '' });
  const [submitted, setSubmitted] = useState(filters);
  const params = useMemo(() => toParams(submitted), [submitted]);
  const query = useQuery({ queryKey: ['advanced-search', 'alliances', params.toString()], queryFn: () => searchAlliances(params) });

  return (
    <section className="space-y-4">
      <SearchFilterPanel onSubmit={() => setSubmitted(filters)} isLoading={query.isLoading}>
        <FilterInput label="Alliance name" value={filters.name} onChange={(name) => setFilters({ ...filters, name })} />
        <FilterInput label="Alliance tag" value={filters.tag} onChange={(tag) => setFilters({ ...filters, tag })} />
        <FilterInput label="Minimum members" type="number" value={filters.minMembers} onChange={(minMembers) => setFilters({ ...filters, minMembers })} />
        <FilterInput label="Minimum score" type="number" value={filters.minScore} onChange={(minScore) => setFilters({ ...filters, minScore })} />
      </SearchFilterPanel>
      {query.isLoading ? <LoadingState message="Searching alliances..." /> : null}
      {query.isError ? <ErrorState title="Alliance search failed" message={(query.error as Error).message} /> : null}
      {query.data ? (
        <SearchResultsTable
          results={query.data.results}
          columns={[
            { key: 'rank', label: 'Rank', render: (row) => `#${row.rank}` },
            { key: 'name', label: 'Alliance', render: (row) => `${row.name} [${row.tag}]` },
            { key: 'members', label: 'Members', render: (row) => row.memberCount },
            { key: 'score', label: 'Score', render: (row) => row.score.toLocaleString() },
            { key: 'projects', label: 'Projects', render: (row) => row.completedProjects },
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
