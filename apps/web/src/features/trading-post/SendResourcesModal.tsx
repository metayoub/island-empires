import { Link } from 'react-router-dom';

export function SendResourcesModal() {
  return (
    <div className="rounded-md border border-border bg-surface/70 p-3">
      <p className="text-sm font-bold text-text">Send resources with trade ships.</p>
      <p className="mt-1 text-xs font-semibold text-muted">Choose a destination city, load resources, review capacity, and confirm.</p>
      <Link
        to="/transport"
        className="mt-3 inline-flex rounded-md border border-primary bg-primary px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-primary-hover"
      >
        Open Send Resources
      </Link>
    </div>
  );
}
