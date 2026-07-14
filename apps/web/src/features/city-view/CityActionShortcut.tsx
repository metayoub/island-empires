import { Link } from 'react-router-dom';

type CityActionShortcutProps = {
  to: string;
  label: string;
  description: string;
};

export function CityActionShortcut({ to, label, description }: CityActionShortcutProps) {
  return (
    <Link
      to={to}
      className="block rounded-md border border-border bg-surface/80 px-3 py-2 transition-colors hover:border-primary hover:bg-primary/10"
    >
      <span className="block text-sm font-black text-text">{label}</span>
      <span className="block text-xs font-semibold text-muted">{description}</span>
    </Link>
  );
}
