import type { QuestStatus, QuestSummary } from '@island-empires/shared-types';
import { Badge } from '../../../components/ui/Badge';
import { Card } from '../../../components/ui/Card';
import { ProgressBar } from '../../../components/ui/ProgressBar';
import { formatQuestReward } from '../formatQuestReward';

const STATUS_BADGE_VARIANT: Record<QuestStatus, 'neutral' | 'info' | 'warning' | 'success'> = {
  locked: 'neutral',
  active: 'info',
  completed: 'warning',
  claimed: 'success',
};

type QuestCardProps = {
  quest: QuestSummary;
};

export function QuestCard({ quest }: QuestCardProps) {
  const isCompleted = quest.status === 'completed';
  const isClaimed = quest.status === 'claimed';

  return (
    <Card
      className={`space-y-3 transition-all duration-200 hover:-translate-y-0.5 hover:shadow-xl ${
        isCompleted ? 'ring-2 ring-warning/30 shadow-[0_0_28px_rgba(201,138,46,0.18)]' : ''
      }`}
    >
      <div className="flex items-center justify-between gap-2">
        <div className="flex min-w-0 items-center gap-2">
          <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full border border-border bg-surface-strong text-sm font-black text-primary">
            Q
          </span>
          <h3 className="truncate font-black text-text">{quest.title}</h3>
        </div>
        <Badge variant={STATUS_BADGE_VARIANT[quest.status]}>{quest.status}</Badge>
      </div>
      <p className="text-sm text-muted">{quest.description}</p>
      <div className="space-y-1">
        <div className="flex items-center justify-between text-xs font-bold text-muted">
          <span>Objective</span>
          <span>
            {quest.progress}/{quest.target}
          </span>
        </div>
        <ProgressBar
          value={quest.progress}
          max={quest.target}
          variant={isClaimed ? 'success' : isCompleted ? 'warning' : 'primary'}
        />
      </div>
      <p className="rounded-md border border-border bg-surface/70 px-3 py-2 text-xs font-bold text-muted">
        Reward: {formatQuestReward(quest.rewards)}
      </p>
    </Card>
  );
}
