import type { TechnologySummary } from '@island-empires/shared-types';
import { Badge } from '../../../components/ui/Badge';
import { Button } from '../../../components/ui/Button';
import { Card } from '../../../components/ui/Card';

type TechnologyCardProps = {
  technology: TechnologySummary;
  researchPoints: number;
  isStarting: boolean;
  onStart: () => void;
};

const STATE_BADGE_VARIANT = {
  locked: 'neutral',
  available: 'info',
  researching: 'warning',
  completed: 'success',
} as const;

const BRANCH_ICONS: Record<string, string> = {
  economy: 'E',
  construction: 'C',
  naval: 'N',
  military: 'M',
  science: 'S',
  governance: 'G',
  trade: 'T',
  defense: 'D',
  luxury: 'L',
  espionage: 'X',
};

const STATE_CARD_CLASSES: Record<TechnologySummary['state'], string> = {
  locked: 'opacity-75 saturate-75',
  available: 'hover:-translate-y-0.5 hover:shadow-xl',
  researching: 'ring-2 ring-warning/25 shadow-[0_0_28px_rgba(201,138,46,0.18)]',
  completed: 'ring-1 ring-success/20',
};

export function TechnologyCard({
  technology,
  researchPoints,
  isStarting,
  onStart,
}: TechnologyCardProps) {
  const hasEnoughPoints = researchPoints >= technology.cost;
  const canStart = technology.state === 'available' && hasEnoughPoints;

  const buttonLabel = (() => {
    if (technology.state === 'completed') return 'Completed';
    if (technology.state === 'researching') return 'Researching...';
    if (technology.state === 'locked') return 'Locked';
    if (isStarting) return 'Starting...';
    if (!hasEnoughPoints) return 'Not enough research points';

    return 'Start Research';
  })();

  return (
    <Card className={`flex min-h-[260px] flex-col transition-all duration-200 ${STATE_CARD_CLASSES[technology.state]}`}>
      <div className="flex items-start justify-between gap-2">
        <div className="flex items-start gap-3">
          <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-md border border-border bg-primary/10 text-sm font-black uppercase text-primary shadow-inner">
            {BRANCH_ICONS[technology.branch] ?? technology.branch.slice(0, 1)}
          </span>
          <div>
            <h3 className="font-black text-text">{technology.name}</h3>
            <p className="mt-1 text-xs font-bold uppercase tracking-wide text-muted">
              {technology.category ?? technology.branch}
              {technology.tier ? ` · Tier ${technology.tier}` : ''}
            </p>
          </div>
        </div>
        <div className="flex shrink-0 flex-col items-end gap-1">
          <Badge variant={STATE_BADGE_VARIANT[technology.state]}>{technology.state}</Badge>
        </div>
      </div>
      <p className="mt-4 text-sm leading-6 text-muted">{technology.description}</p>
      <div className="mt-4 grid gap-2 text-xs font-bold text-muted sm:grid-cols-2">
        <span className="rounded-md border border-border bg-surface/70 px-2 py-1 shadow-inner">
          Cost: <strong className="text-text">{technology.cost}</strong>
        </span>
        <span className="rounded-md border border-border bg-surface/70 px-2 py-1 shadow-inner">
          Duration: <strong className="text-text">{technology.durationSeconds}s</strong>
        </span>
        {technology.requirements.length > 0 ? (
          <span className="rounded-md border border-border bg-surface/70 px-2 py-1 shadow-inner sm:col-span-2">
            Requires: <strong className="text-text">{technology.requirements.join(', ')}</strong>
          </span>
        ) : null}
        {(technology.unlocks ?? []).length > 0 ? (
          <span className="rounded-md border border-border bg-surface/70 px-2 py-1 shadow-inner sm:col-span-2">
            Unlocks: <strong className="text-text">{technology.unlocks?.join(', ')}</strong>
          </span>
        ) : null}
      </div>
      <Button
        variant="primary"
        className="mt-auto w-full"
        onClick={onStart}
        disabled={!canStart || isStarting}
      >
        {buttonLabel}
      </Button>
    </Card>
  );
}
