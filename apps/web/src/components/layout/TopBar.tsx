import type { BootstrapResponse, CitySummary } from '@island-empires/shared-types';
import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { getUnreadCounters } from '../../features/communications/communications.api';

type TopBarProps = {
  bootstrap: BootstrapResponse;
  apiOnline: boolean;
  cities: CitySummary[];
  selectedCityId: string | null;
  onCityChange: (cityId: string) => void;
};

export function TopBar({
  bootstrap,
  apiOnline,
  cities,
  selectedCityId,
  onCityChange,
}: TopBarProps) {
  const unreadQuery = useQuery({
    queryKey: ['notifications', 'unread-count'],
    queryFn: getUnreadCounters,
    retry: 1,
    refetchInterval: 15000,
  });
  const unreadTotal = unreadQuery.data?.total ?? 0;

  return (
    <header className="border-b border-border/80 bg-[#2f2a24] text-white shadow-lg">
      <div className="mx-auto flex max-w-[1760px] flex-col gap-2 px-4 py-4 sm:px-6 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <h1 className="text-2xl font-black tracking-wide">Island Empires</h1>
          <p className="mt-1 text-sm font-medium text-white/70">
            Player: {bootstrap.player.name} · World: {bootstrap.world.name}
          </p>
        </div>
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
          <Link
            to="/notifications"
            className="flex items-center gap-2 rounded-full border border-white/10 bg-white/10 px-3 py-1.5 text-sm font-bold text-white/80 shadow-inner transition hover:bg-white/15"
          >
            <span>Notifications</span>
            <span
              className={`rounded-full px-2 py-0.5 text-xs font-black ${
                unreadTotal > 0 ? 'bg-warning text-white' : 'bg-white/10 text-white/60'
              }`}
            >
              {unreadTotal}
            </span>
          </Link>
          <label className="flex items-center gap-2 rounded-full border border-white/10 bg-white/10 px-3 py-1.5 shadow-inner">
            <span className="text-xs font-black uppercase tracking-wide text-white/60">City</span>
            <select
              className="max-w-[260px] bg-transparent text-sm font-bold text-white outline-none"
              value={selectedCityId ?? ''}
              onChange={(event) => onCityChange(event.target.value)}
              disabled={cities.length === 0}
            >
              {cities.length === 0 ? <option value="">Loading cities...</option> : null}
              {cities.map((city) => (
                <option key={city.id} value={city.id} className="text-text">
                  {city.name}
                  {city.island ? ` · ${city.island.name}` : ''}
                </option>
              ))}
            </select>
          </label>
          <div className="flex items-center gap-3 rounded-full border border-white/10 bg-white/10 px-3 py-1.5 shadow-inner">
            <span
              className={`h-2.5 w-2.5 rounded-full shadow-[0_0_0_4px_rgba(255,255,255,0.08)] ${
                apiOnline ? 'bg-success' : 'bg-danger'
              }`}
              aria-hidden="true"
            />
            <span className="text-sm font-bold text-white/80">
              API {apiOnline ? 'Online' : 'Offline'}
            </span>
          </div>
        </div>
      </div>
    </header>
  );
}
