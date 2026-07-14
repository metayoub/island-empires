import { useQuery } from '@tanstack/react-query';
import { useMemo, useState } from 'react';
import { ErrorState, LoadingState } from '../../components/ui';
import { FilterInput, SearchFilterPanel } from './SearchFilterPanel';
import { SearchResultsTable } from './SearchResultsTable';
import { searchCities } from './search.api';

export function CityAdvancedSearch() {
  const [filters, setFilters] = useState({ name: '', ownerName: '', allianceTag: '', minLevel: '' });
  const [submitted, setSubmitted] = useState(filters);
  const params = useMemo(() => toParams(submitted), [submitted]);
  const query = useQuery({ queryKey: ['advanced-search', 'cities', params.toString()], queryFn: () => searchCities(params) });

  return (
    <section className="space-y-4">
      <SearchFilterPanel onSubmit={() => setSubmitted(filters)} isLoading={query.isLoading}>
        <FilterInput label="City name" value={filters.name} onChange={(name) => setFilters({ ...filters, name })} />
        <FilterInput label="Owner name" value={filters.ownerName} onChange={(ownerName) => setFilters({ ...filters, ownerName })} />
        <FilterInput label="Alliance tag" value={filters.allianceTag} onChange={(allianceTag) => setFilters({ ...filters, allianceTag })} />
        <FilterInput label="Minimum level" type="number" value={filters.minLevel} onChange={(minLevel) => setFilters({ ...filters, minLevel })} />
      </SearchFilterPanel>
      {query.isLoading ? <LoadingState message="Searching cities..." /> : null}
      {query.isError ? <ErrorState title="City search failed" message={(query.error as Error).message} /> : null}
      {query.data ? (
        <SearchResultsTable
          results={query.data.results}
          columns={[
            { key: 'city', label: 'City', render: (row) => row.cityName },
            { key: 'owner', label: 'Owner', render: (row) => row.ownerName },
            { key: 'alliance', label: 'Alliance', render: (row) => row.allianceTag ?? 'None' },
            { key: 'level', label: 'Level', render: (row) => row.level },
            { key: 'island', label: 'Island', render: (row) => row.island ? `${row.island.name} (${row.island.x}, ${row.island.y})` : 'Unplaced' },
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
