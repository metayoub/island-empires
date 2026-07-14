import { Link } from 'react-router-dom';
import { Button } from '../../../components/ui/Button';

type CityViewToolbarProps = {
  showLabels: boolean;
  onToggleLabels: () => void;
};

const LINK_CLASSES =
  'rounded px-4 py-2 text-sm font-semibold text-primary transition-colors hover:bg-surface-strong';

export function CityViewToolbar({ showLabels, onToggleLabels }: CityViewToolbarProps) {
  return (
    <div className="flex flex-wrap items-center gap-2">
      <Button variant="secondary" onClick={onToggleLabels}>
        {showLabels ? 'Hide labels' : 'Show labels'}
      </Button>
      <Link to="/overview" className={LINK_CLASSES}>
        City Overview
      </Link>
      <Link to="/guide" className={LINK_CLASSES}>
        Guide
      </Link>
    </div>
  );
}
