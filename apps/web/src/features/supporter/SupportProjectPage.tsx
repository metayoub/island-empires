import { useMutation, useQuery } from '@tanstack/react-query';
import { Alert, Button, Card, ErrorState, LoadingState } from '../../components/ui';
import { createSupportCheckout, getDonationHistory, getSupporterPacks } from './supporter.api';

function formatMoney(cents: number, currency: string) {
  return new Intl.NumberFormat(undefined, { style: 'currency', currency }).format(cents / 100);
}

export function SupportProjectPage() {
  const packsQuery = useQuery({ queryKey: ['supporter-packs'], queryFn: getSupporterPacks });
  const historyQuery = useQuery({ queryKey: ['supporter-history'], queryFn: getDonationHistory });
  const checkoutMutation = useMutation({
    mutationFn: createSupportCheckout,
    onSuccess: (data) => window.location.assign(data.checkoutUrl),
  });

  if (packsQuery.isLoading) return <LoadingState message="Loading support options" />;
  if (packsQuery.isError) return <ErrorState message={packsQuery.error.message} />;
  if (!packsQuery.data) return <LoadingState message="Loading support options" />;

  return (
    <main className="mx-auto w-full max-w-6xl space-y-4">
      <section className="game-surface game-frame rounded-lg p-4">
        <h1 className="text-2xl font-black text-text">Support Island Empires</h1>
        <p className="mt-2 max-w-3xl text-sm font-semibold leading-6 text-muted">
          Island Empires is free to play. Optional contributions help fund hosting, development, maintenance, and future updates.
          Supporter rewards are cosmetic and do not provide combat or progression advantages.
        </p>
      </section>

      <section className="game-surface game-frame rounded-lg p-4">
        <h2 className="text-xl font-black text-text">Fairness Promise</h2>
        <div className="mt-3 grid gap-2 md:grid-cols-2">
          {packsQuery.data.fairnessPromise.map((line) => (
            <div key={line} className="rounded-md border border-border bg-surface/70 p-3 text-sm font-bold text-muted">
              {line}
            </div>
          ))}
        </div>
      </section>

      {checkoutMutation.isError ? <Alert variant="danger">{checkoutMutation.error.message}</Alert> : null}

      <section className="grid gap-3 md:grid-cols-2">
        {packsQuery.data.packs.map((pack) => (
          <Card key={pack.supporterPackId} className="grid gap-4 p-4">
            <div className="flex items-start justify-between gap-3">
              <div>
                <h2 className="text-xl font-black text-text">{pack.name}</h2>
                <p className="mt-1 text-sm font-semibold leading-6 text-muted">{pack.description}</p>
              </div>
              <span className="rounded-md border border-primary px-3 py-1 text-sm font-black text-primary">
                {formatMoney(pack.priceCents, pack.currency)}
              </span>
            </div>
            <div>
              <p className="text-xs font-black uppercase text-muted">Includes</p>
              <ul className="mt-2 grid gap-2">
                {pack.items.map((item) => (
                  <li key={item.itemId} className="rounded-md border border-border bg-surface/70 px-3 py-2 text-sm font-bold text-text">
                    {item.quantity}x {item.name}
                  </li>
                ))}
              </ul>
            </div>
            <div className="flex flex-wrap gap-2 text-xs font-black uppercase">
              <span className="rounded border border-border px-2 py-1 text-muted">Cosmetic only</span>
              <span className="rounded border border-border px-2 py-1 text-muted">No gameplay advantage</span>
            </div>
            <Button disabled={checkoutMutation.isPending} onClick={() => checkoutMutation.mutate(pack.supporterPackId)}>
              Support the Project
            </Button>
          </Card>
        ))}
      </section>

      <section className="game-surface game-frame rounded-lg p-4">
        <h2 className="text-xl font-black text-text">Donation History</h2>
        <div className="mt-3 grid gap-2">
          {(historyQuery.data?.donations ?? []).length === 0 ? (
            <p className="text-sm font-semibold text-muted">No support history yet.</p>
          ) : (
            historyQuery.data!.donations.map((donation) => (
              <div key={donation.id} className="flex flex-wrap items-center justify-between gap-2 rounded-md border border-border bg-surface/70 p-3 text-sm font-bold">
                <span>{donation.supporterPackName}</span>
                <span>{formatMoney(donation.amountCents, donation.currency)}</span>
                <span className="capitalize text-muted">{donation.status.replaceAll('_', ' ')}</span>
              </div>
            ))
          )}
        </div>
      </section>
    </main>
  );
}

export function SupportSuccessPage() {
  return <Alert variant="success">Thanks. Your supporter items are granted after the verified payment webhook is received.</Alert>;
}

export function SupportCancelPage() {
  return <Alert>Your support checkout was cancelled. Island Empires remains fully playable without donating.</Alert>;
}
