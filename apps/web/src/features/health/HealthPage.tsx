import { useQuery } from '@tanstack/react-query';
import { getHealth } from './health.api';

export function HealthPage() {
  const healthQuery = useQuery({
    queryKey: ['health'],
    queryFn: getHealth,
    refetchInterval: 15000,
    retry: 1,
  });

  const isOnline = healthQuery.data?.status === 'ok';

  return (
    <main className="min-h-screen bg-[#f4f7f6] px-6 py-10 text-gray-950">
      <section className="mx-auto flex max-w-4xl flex-col gap-6">
        <div>
          <p className="text-sm font-semibold uppercase tracking-wide text-emerald-700">
            Project Foundation
          </p>
          <h1 className="mt-3 text-4xl font-bold tracking-normal">Island Empires</h1>
          <p className="mt-3 text-lg text-gray-700">Long-term browser strategy game</p>
        </div>

        <div className="rounded border border-gray-200 bg-white p-5 shadow-sm">
          <div className="flex flex-wrap items-center gap-3">
            <span className="text-base font-semibold">API Status:</span>
            <span
              className={`rounded px-3 py-1 text-sm font-semibold ${
                isOnline
                  ? 'bg-emerald-100 text-emerald-800'
                  : 'bg-red-100 text-red-800'
              }`}
            >
              {isOnline ? 'Online' : 'Offline'}
            </span>
          </div>
          <p className="mt-3 text-sm text-gray-600">
            {healthQuery.data
              ? `Last checked ${new Date(healthQuery.data.timestamp).toLocaleString()}`
              : 'Waiting for API health response'}
          </p>
        </div>
      </section>
    </main>
  );
}

