import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { FormEvent, useMemo, useState } from 'react';
import type { MarketplaceOfferSummary, MarketplaceOfferType, ResourceBalance } from '@island-empires/shared-types';
import { Button, Card, EmptyState, ErrorState, LoadingState } from '../../components/ui';
import { useAppStore } from '../../stores/app.store';
import {
  acceptMarketplaceOffer,
  cancelMarketplaceOffer,
  createMarketplaceOffer,
  getMarketplaceHistory,
  getMarketplaceOffers,
  getMyMarketplaceOffers,
} from './marketplace.api';

const RESOURCE_TYPES: Array<keyof ResourceBalance> = ['wood', 'gold', 'marble', 'wine', 'crystal', 'sulfur'];

function formatResource(resource: string): string {
  return resource.charAt(0).toUpperCase() + resource.slice(1);
}

function formatDate(value: string | null): string {
  if (!value) return 'Pending';
  return new Intl.DateTimeFormat(undefined, { dateStyle: 'medium', timeStyle: 'short' }).format(new Date(value));
}

function OfferRow({
  offer,
  mode,
  onAccept,
  onCancel,
}: {
  offer: MarketplaceOfferSummary;
  mode: 'browse' | 'mine';
  onAccept?: (offer: MarketplaceOfferSummary) => void;
  onCancel?: (offer: MarketplaceOfferSummary) => void;
}) {
  const isOwnBrowseOffer = mode === 'browse' && offer.isOwnOffer;
  const acceptDisabled = offer.status !== 'active' || isOwnBrowseOffer;

  return (
    <Card className="grid gap-3 p-4 md:grid-cols-[1.5fr_1fr_auto] md:items-center">
      <div>
        <div className="flex flex-wrap items-center gap-2">
          <p className="text-sm font-black text-text">
            {offer.offeredAmount.toLocaleString()} {formatResource(offer.offeredResource)} for{' '}
            {offer.requestedAmount.toLocaleString()} {formatResource(offer.requestedResource)}
          </p>
          {offer.isOwnOffer ? (
            <span className="rounded-sm border border-primary/30 bg-primary/10 px-2 py-0.5 text-[0.7rem] font-black uppercase tracking-wide text-primary">
              Your offer
            </span>
          ) : null}
        </div>
        <p className="mt-1 text-xs font-semibold text-muted">
          {offer.creator.playerName} · {offer.creatorCity.name}
          {offer.creatorCity.x !== null && offer.creatorCity.y !== null ? ` (${offer.creatorCity.x}, ${offer.creatorCity.y})` : ''}
        </p>
      </div>
      <div className="text-xs font-semibold text-muted">
        <p>Status: {offer.status}</p>
        <p>Expires: {formatDate(offer.expiresAt)}</p>
      </div>
      <div className="flex gap-2">
        {mode === 'browse' ? (
          <Button className="px-3 py-1.5" onClick={() => onAccept?.(offer)} disabled={acceptDisabled}>
            {isOwnBrowseOffer ? 'Own offer' : 'Accept'}
          </Button>
        ) : (
          <Button className="px-3 py-1.5" variant="secondary" onClick={() => onCancel?.(offer)} disabled={offer.status !== 'active'}>
            Cancel
          </Button>
        )}
      </div>
    </Card>
  );
}

export function MarketplacePage() {
  const queryClient = useQueryClient();
  const selectedCityId = useAppStore((state) => state.selectedCityId);
  const [tab, setTab] = useState('browse');
  const [offeredResource, setOfferedResource] = useState('');
  const [requestedResource, setRequestedResource] = useState('');
  const [offerType, setOfferType] = useState<MarketplaceOfferType>('sell_offer');
  const [form, setForm] = useState({
    offeredResource: 'wood' as keyof ResourceBalance,
    requestedResource: 'gold' as keyof ResourceBalance,
    offeredAmount: 500,
    requestedAmount: 250,
  });
  const params = useMemo(() => {
    const next = new URLSearchParams();
    if (offeredResource) next.set('offeredResource', offeredResource);
    if (requestedResource) next.set('requestedResource', requestedResource);
    next.set('pageSize', '50');
    return next;
  }, [offeredResource, requestedResource]);

  const offersQuery = useQuery({
    queryKey: ['marketplace-offers', params.toString()],
    queryFn: () => getMarketplaceOffers(params),
  });
  const myOffersQuery = useQuery({
    queryKey: ['marketplace-my-offers'],
    queryFn: getMyMarketplaceOffers,
    enabled: tab === 'mine',
  });
  const historyQuery = useQuery({
    queryKey: ['marketplace-history'],
    queryFn: getMarketplaceHistory,
    enabled: tab === 'history',
  });
  const refresh = () => {
    void queryClient.invalidateQueries({ queryKey: ['marketplace-offers'] });
    void queryClient.invalidateQueries({ queryKey: ['marketplace-my-offers'] });
    void queryClient.invalidateQueries({ queryKey: ['marketplace-history'] });
  };
  const createMutation = useMutation({
    mutationFn: () =>
      createMarketplaceOffer({
        creatorCityId: selectedCityId ?? '',
        offerType,
        ...form,
      }),
    onSuccess: refresh,
  });
  const acceptMutation = useMutation({
    mutationFn: (offerId: string) => acceptMarketplaceOffer(offerId, { acceptingCityId: selectedCityId ?? '' }),
    onSuccess: refresh,
  });
  const cancelMutation = useMutation({
    mutationFn: (offerId: string) => cancelMarketplaceOffer(offerId),
    onSuccess: refresh,
  });

  function submitOffer(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    createMutation.mutate();
  }

  return (
    <main className="mx-auto w-full max-w-6xl space-y-4">
      <div className="game-surface game-frame rounded-lg p-4">
        <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
          <div>
            <h1 className="text-2xl font-black text-text">Marketplace</h1>
            <p className="text-sm font-semibold text-muted">Exchange reserved resources through timed trade movements.</p>
          </div>
          <div role="tablist" className="flex flex-wrap gap-2">
            {[
              ['browse', 'Browse Offers'],
              ['create', 'Create Offer'],
              ['mine', 'My Offers'],
              ['history', 'Trade History'],
            ].map(([id, label]) => (
              <button
                key={id}
                type="button"
                role="tab"
                aria-selected={tab === id}
                onClick={() => setTab(id)}
                className={`rounded-md border px-3 py-2 text-sm font-bold ${
                  tab === id
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

      {tab === 'browse' ? (
        <section className="space-y-3">
          <div className="game-surface game-frame grid gap-3 rounded-lg p-4 md:grid-cols-3">
            <select className="rounded-md border border-border bg-surface p-2 text-sm font-semibold" value={offeredResource} onChange={(event) => setOfferedResource(event.target.value)}>
              <option value="">Any offered resource</option>
              {RESOURCE_TYPES.map((resource) => <option key={resource} value={resource}>{formatResource(resource)}</option>)}
            </select>
            <select className="rounded-md border border-border bg-surface p-2 text-sm font-semibold" value={requestedResource} onChange={(event) => setRequestedResource(event.target.value)}>
              <option value="">Any requested resource</option>
              {RESOURCE_TYPES.map((resource) => <option key={resource} value={resource}>{formatResource(resource)}</option>)}
            </select>
          </div>
          {offersQuery.isLoading ? <LoadingState message="Loading offers" /> : null}
          {offersQuery.isError ? <ErrorState title="Marketplace unavailable" message={(offersQuery.error as Error).message} /> : null}
          {offersQuery.data?.offers.length === 0 ? <EmptyState title="No active offers" description="No player offers match these filters." /> : null}
          {offersQuery.data?.offers.map((offer) => (
            <OfferRow key={offer.id} offer={offer} mode="browse" onAccept={(selected) => acceptMutation.mutate(selected.id)} />
          ))}
        </section>
      ) : null}

      {tab === 'create' ? (
        <form className="game-surface game-frame grid gap-4 rounded-lg p-4 md:grid-cols-2" onSubmit={submitOffer}>
          <label className="grid gap-1 text-sm font-bold text-text">
            Type
            <select className="rounded-md border border-border bg-surface p-2" value={offerType} onChange={(event) => setOfferType(event.target.value as MarketplaceOfferType)}>
              <option value="sell_offer">Sell offer</option>
              <option value="buy_offer">Buy offer</option>
            </select>
          </label>
          <label className="grid gap-1 text-sm font-bold text-text">
            Offered resource
            <select className="rounded-md border border-border bg-surface p-2" value={form.offeredResource} onChange={(event) => setForm({ ...form, offeredResource: event.target.value as keyof ResourceBalance })}>
              {RESOURCE_TYPES.map((resource) => <option key={resource} value={resource}>{formatResource(resource)}</option>)}
            </select>
          </label>
          <label className="grid gap-1 text-sm font-bold text-text">
            Offered amount
            <input className="rounded-md border border-border bg-surface p-2" type="number" min="1" value={form.offeredAmount} onChange={(event) => setForm({ ...form, offeredAmount: Number(event.target.value) })} />
          </label>
          <label className="grid gap-1 text-sm font-bold text-text">
            Requested resource
            <select className="rounded-md border border-border bg-surface p-2" value={form.requestedResource} onChange={(event) => setForm({ ...form, requestedResource: event.target.value as keyof ResourceBalance })}>
              {RESOURCE_TYPES.map((resource) => <option key={resource} value={resource}>{formatResource(resource)}</option>)}
            </select>
          </label>
          <label className="grid gap-1 text-sm font-bold text-text">
            Requested amount
            <input className="rounded-md border border-border bg-surface p-2" type="number" min="1" value={form.requestedAmount} onChange={(event) => setForm({ ...form, requestedAmount: Number(event.target.value) })} />
          </label>
          <div className="flex items-end">
            <Button type="submit" disabled={!selectedCityId || createMutation.isPending}>
              Create Offer
            </Button>
          </div>
          {createMutation.isError ? <p className="md:col-span-2 text-sm font-bold text-danger">{(createMutation.error as Error).message}</p> : null}
        </form>
      ) : null}

      {tab === 'mine' ? (
        <section className="space-y-3">
          {myOffersQuery.isLoading ? <LoadingState message="Loading your offers" /> : null}
          {myOffersQuery.data?.offers.length === 0 ? <EmptyState title="No offers yet" description="Create a marketplace offer from this city." /> : null}
          {myOffersQuery.data?.offers.map((offer) => (
            <OfferRow key={offer.id} offer={offer} mode="mine" onCancel={(selected) => cancelMutation.mutate(selected.id)} />
          ))}
        </section>
      ) : null}

      {tab === 'history' ? (
        <section className="space-y-3">
          {historyQuery.isLoading ? <LoadingState message="Loading trade history" /> : null}
          {historyQuery.data?.trades.length === 0 ? <EmptyState title="No completed trades" description="Accepted marketplace offers will appear here." /> : null}
          {historyQuery.data?.trades.map((trade) => (
            <Card key={trade.id} className="p-4">
              <p className="text-sm font-black text-text">
                {trade.amountFromSeller.toLocaleString()} {formatResource(trade.resourceFromSeller)} for {trade.amountFromBuyer.toLocaleString()} {formatResource(trade.resourceFromBuyer)}
              </p>
              <p className="mt-1 text-xs font-semibold text-muted">
                Tax: {trade.taxFromSellerSide + trade.taxFromBuyerSide} · Completed: {formatDate(trade.completedAt)}
              </p>
            </Card>
          ))}
        </section>
      ) : null}
    </main>
  );
}
