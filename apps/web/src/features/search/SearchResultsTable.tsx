import { Card, EmptyState } from '../../components/ui';

type SearchResultsTableProps<T> = {
  results: T[];
  columns: Array<{ key: string; label: string; render: (row: T) => string | number }>;
};

export function SearchResultsTable<T>({ results, columns }: SearchResultsTableProps<T>) {
  if (results.length === 0) {
    return <EmptyState title="No matches" description="Adjust filters or clear narrow criteria." />;
  }

  return (
    <Card className="overflow-x-auto p-0">
      <table className="w-full min-w-[720px] text-left text-sm">
        <thead className="border-b border-border bg-surface-strong text-xs uppercase text-muted">
          <tr>
            {columns.map((column) => (
              <th key={column.key} className="px-4 py-3 font-black">
                {column.label}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {results.map((row, index) => (
            <tr key={index} className="border-b border-border/70 last:border-b-0">
              {columns.map((column) => (
                <td key={column.key} className="px-4 py-3 font-semibold text-text">
                  {column.render(row)}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </Card>
  );
}
