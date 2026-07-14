import { Link } from 'react-router-dom';

export function CreateOfferModal() {
  return (
    <div className="rounded-md border border-border bg-surface/70 p-3">
      <p className="text-sm font-bold text-text">Create a marketplace offer.</p>
      <p className="mt-1 text-xs font-semibold text-muted">Reserve offered goods, set the request, and publish from the current city.</p>
      <Link
        to="/marketplace"
        className="mt-3 inline-flex rounded-md border border-primary bg-primary px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-primary-hover"
      >
        Create Offer
      </Link>
    </div>
  );
}
