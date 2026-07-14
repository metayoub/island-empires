import { useQuery } from '@tanstack/react-query';
import { useMemo, useState } from 'react';
import { ErrorState, LoadingState } from '../../components/ui';
import { FilterInput, SearchFilterPanel } from './SearchFilterPanel';
import { SearchResultsTable } from './SearchResultsTable';
import { searchMarketplace } from './search.api';

export function MarketplaceAdvancedSearch() {
  const [filters, setFilters] = useState({ offeredResource: '', requestedResource: '', minAmount: '', sellerAlliance: '' });
  const [submitted, setSubmitted] = useState(filters);
  const params = useMemo(() => toParams(submitted), [submitted]);
  const query = useQuery({ queryKey: ['advanced-search', 'marketplace', params.toString()], queryFn: () => searchMarketplace(params) });

  return (
    <section className="space-y-4">
      <SearchFilterPanel onSubmit={() => setSubmitted(filters)} isLoading={query.isLoading}>
        <FilterInput label="Offered resource" value={filters.offeredResource} onChange={(offeredResource) => setFilters({ ...filters, offeredResource })} placeholder="wood, marble, gold..." />
        <FilterInput label="Requested resource" value={filters.requestedResource} onChange={(requestedResource) => setFilters({ ...filters, requestedResource })} />
        <FilterInput label="Minimum amount" type="number" value={filters.minAmount} onChange={(minAmount) => setFilters({ ...filters, minAmount })} />
        <FilterInput label="Seller alliance" value={filters.sellerAlliance} onChange={(sellerAlliance) => setFilters({ ...filters, sellerAlliance })} />
      </SearchFilterPanel>
      {query.isLoading ? <LoadingState message="Searching marketplace..." /> : null}
      {query.isError ? <ErrorState title="Marketplace search failed" message={(query.error as Error).message} /> : null}
      {query.data ? (
        <SearchResultsTable
          results={query.data.results}
          columns={[
            { key: 'offer', label: 'Offer', render: (row) => `${row.offeredAmount} ${row.offeredResource}` },
            { key: 'request', label: 'Requests', render: (row) => `${row.requestedAmount} ${row.requestedResource}` },
            { key: 'seller', label: 'Seller', render: (row) => row.creator.playerName },
            { key: 'alliance', label: 'Alliance', render: (row) => row.creator.allianceTag ?? 'None' },
            { key: 'ratio', label: 'Ratio', render: (row) => row.ratio.toFixed(2) },
          ]}
        />
      ) : null}
    </section>
  );
}

function toParams(values: Record<string, string>) {
  const params = new URLSearchParams({ pageSize: '50', notExpired: 'true' });
  Object.entries(values).forEach(([key, value]) => {
    if (value) params.set(key, value);
  });
  return params;
}
