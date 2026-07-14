import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useMemo, useState } from 'react';
import type { LiveEventReward, LiveEventSummary } from '@island-empires/shared-types';
import { Alert, Button, Card, EmptyState, ErrorState, LoadingState, ProgressBar } from '../../components/ui';
import {
  claimLiveEventReward,
  getLiveEvent,
  getLiveEvents,
  joinLiveEvent,
} from './live-events.api';

const REWARD_KEYS: Array<keyof LiveEventReward> = [
  'wood',
  'gold',
  'marble',
  'wine',
  'crystal',
  'sulfur',
  'researchPoints',
];

function formatDate(value: string): string {
  return new Intl.DateTimeFormat(undefined, {
    dateStyle: 'medium',
    timeStyle: 'short',
  }).format(new Date(value));
}

function formatType(value: string): string {
  return value
    .split('_')
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(' ');
}

function formatRewards(reward: LiveEventReward): string {
  const parts = REWARD_KEYS.filter((key) => (reward[key] ?? 0) > 0).map((key) => {
    const label = key === 'researchPoints' ? 'research' : key;
    return `${reward[key]?.toLocaleString()} ${label}`;
  });
  return parts.length > 0 ? parts.join(', ') : 'Participation credit';
}

function EventCard({
  event,
  isSelected,
  onSelect,
  onJoin,
  onClaim,
  isWorking,
}: {
  event: LiveEventSummary;
  isSelected: boolean;
  onSelect: (eventId: string) => void;
  onJoin: (eventId: string) => void;
  onClaim: (eventId: string) => void;
  isWorking: boolean;
}) {
  const percent = Math.min(100, event.playerProgress.points);
  const canClaim = event.playerProgress.points > 0 && !event.playerProgress.rewardClaimed;
  return (
    <Card className={`grid gap-4 p-4 ${isSelected ? 'ring-2 ring-primary/50' : ''}`}>
      <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
        <div>
          <div className="flex flex-wrap items-center gap-2">
            <span className="rounded-md border border-border bg-surface-strong px-2 py-1 text-xs font-black uppercase text-primary">
              {event.status}
            </span>
            <span className="text-xs font-bold text-muted">{formatType(event.type)}</span>
          </div>
          <h2 className="mt-2 text-xl font-black text-text">{event.title}</h2>
          <p className="mt-1 max-w-2xl text-sm font-semibold leading-6 text-muted">{event.description}</p>
        </div>
        <div className="text-sm font-bold text-muted md:text-right">
          <p>{formatDate(event.startsAt)}</p>
          <p>{formatDate(event.endsAt)}</p>
        </div>
      </div>

      <div className="grid gap-3 md:grid-cols-3">
        <div className="rounded-md border border-border bg-surface/70 p-3">
          <p className="text-xs font-black uppercase text-muted">Action</p>
          <p className="mt-1 text-sm font-bold text-text">{event.participationAction}</p>
        </div>
        <div className="rounded-md border border-border bg-surface/70 p-3">
          <p className="text-xs font-black uppercase text-muted">Reward</p>
          <p className="mt-1 text-sm font-bold text-text">{formatRewards(event.reward)}</p>
        </div>
        <div className="rounded-md border border-border bg-surface/70 p-3">
          <p className="text-xs font-black uppercase text-muted">Bonus</p>
          <p className="mt-1 text-sm font-bold text-text">{event.bonusPercent ?? 0}%</p>
        </div>
      </div>

      <div className="grid gap-2">
        <div className="flex items-center justify-between gap-3 text-sm font-bold text-muted">
          <span>{event.playerProgress.points.toLocaleString()} points</span>
          <span>{event.playerProgress.rank ? `Rank ${event.playerProgress.rank}` : 'Unranked'}</span>
        </div>
        <ProgressBar value={percent} max={100} />
      </div>

      <div className="flex flex-wrap gap-2">
        <Button variant="secondary" onClick={() => onSelect(event.id)}>
          Rankings
        </Button>
        <Button
          onClick={() => onJoin(event.id)}
          disabled={isWorking || event.status !== 'active' || event.playerProgress.joined}
        >
          {event.playerProgress.joined ? 'Joined' : 'Join'}
        </Button>
        <Button
          variant="secondary"
          onClick={() => onClaim(event.id)}
          disabled={isWorking || !canClaim}
        >
          {event.playerProgress.rewardClaimed ? 'Claimed' : 'Claim Reward'}
        </Button>
      </div>
    </Card>
  );
}

export function LiveEventsPage() {
  const queryClient = useQueryClient();
  const eventsQuery = useQuery({ queryKey: ['live-events'], queryFn: getLiveEvents });
  const [selectedEventId, setSelectedEventId] = useState<string | null>(null);
  const selectedEventQuery = useQuery({
    queryKey: ['live-event', selectedEventId],
    queryFn: () => getLiveEvent(selectedEventId ?? ''),
    enabled: Boolean(selectedEventId),
  });
  const events = eventsQuery.data?.events ?? [];
  const defaultSelectedId = useMemo(() => events[0]?.id ?? null, [events]);
  const detail = selectedEventQuery.data;
  const workingEventId = useMemo(() => selectedEventId ?? defaultSelectedId, [defaultSelectedId, selectedEventId]);

  const refreshEvents = () => {
    void queryClient.invalidateQueries({ queryKey: ['live-events'] });
    if (workingEventId) {
      void queryClient.invalidateQueries({ queryKey: ['live-event', workingEventId] });
    }
  };
  const joinMutation = useMutation({
    mutationFn: joinLiveEvent,
    onSuccess: refreshEvents,
  });
  const claimMutation = useMutation({
    mutationFn: claimLiveEventReward,
    onSuccess: refreshEvents,
  });

  if (eventsQuery.isLoading) return <LoadingState message="Loading events" />;
  if (eventsQuery.isError) return <ErrorState message={eventsQuery.error.message} />;

  return (
    <main className="mx-auto w-full max-w-6xl space-y-4">
      <section className="game-surface game-frame rounded-lg p-4">
        <div className="flex flex-col gap-2 md:flex-row md:items-end md:justify-between">
          <div>
            <h1 className="text-2xl font-black text-text">Events</h1>
            <p className="text-sm font-semibold text-muted">
              Time-bounded activities for normal city, research, battle, and alliance play.
            </p>
          </div>
          <Button variant="ghost" onClick={() => refreshEvents()}>
            Refresh
          </Button>
        </div>
      </section>

      {joinMutation.isError ? <Alert variant="danger">{joinMutation.error.message}</Alert> : null}
      {claimMutation.isError ? <Alert variant="danger">{claimMutation.error.message}</Alert> : null}

      {events.length === 0 ? (
        <EmptyState title="No events available" description="The event schedule is currently empty." />
      ) : (
        <section className="grid gap-4">
          {events.map((event) => (
            <EventCard
              key={event.id}
              event={event}
              isSelected={(selectedEventId ?? defaultSelectedId) === event.id}
              onSelect={setSelectedEventId}
              onJoin={(eventId) => joinMutation.mutate(eventId)}
              onClaim={(eventId) => claimMutation.mutate(eventId)}
              isWorking={joinMutation.isPending || claimMutation.isPending}
            />
          ))}
        </section>
      )}

      {detail ? (
        <section className="game-surface game-frame rounded-lg p-4">
          <h2 className="text-xl font-black text-text">{detail.event.title} Rankings</h2>
          <div className="mt-3 grid gap-2">
            {detail.rankings.length === 0 ? (
              <p className="text-sm font-semibold text-muted">No ranked participation yet.</p>
            ) : (
              detail.rankings.map((row) => (
                <div
                  key={row.playerId}
                  className="grid grid-cols-[64px_minmax(0,1fr)_120px] items-center gap-3 rounded-md border border-border bg-surface/80 px-3 py-2 text-sm"
                >
                  <span className="font-black text-primary">#{row.rank}</span>
                  <span className="truncate font-bold text-text">{row.playerName}</span>
                  <span className="text-right font-bold text-muted">{row.points.toLocaleString()} pts</span>
                </div>
              ))
            )}
          </div>
        </section>
      ) : null}
    </main>
  );
}
