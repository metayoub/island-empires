import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Badge } from '../../../components/ui/Badge';
import { Button } from '../../../components/ui/Button';
import { Panel } from '../../../components/ui/Panel';
import { Skeleton } from '../../../components/ui/Skeleton';
import { formatQuestReward } from '../formatQuestReward';
import { claimQuestReward, getQuestOverview } from '../quests.api';

export function TutorialPanel() {
  const queryClient = useQueryClient();

  const questsQuery = useQuery({
    queryKey: ['quest-overview'],
    queryFn: getQuestOverview,
    retry: 1,
    refetchInterval: 10000,
  });

  const claimMutation = useMutation({
    mutationFn: (questId: string) => claimQuestReward(questId),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['quest-overview'] });
      void queryClient.invalidateQueries({ queryKey: ['next-action'] });
      void queryClient.invalidateQueries({ queryKey: ['city-overview'] });
      void queryClient.invalidateQueries({ queryKey: ['research-overview'] });
      void queryClient.invalidateQueries({ queryKey: ['reports'] });
    },
  });

  if (questsQuery.isLoading) {
    return (
      <Panel title="Tutorial">
        <Skeleton className="h-24 w-full" />
      </Panel>
    );
  }

  const currentQuest = questsQuery.data?.currentQuest;

  if (!currentQuest) {
    return null;
  }

  const isCompleted = currentQuest.status === 'completed';

  return (
    <Panel
      title="Current Quest"
      action={<Badge variant={isCompleted ? 'success' : 'info'}>{currentQuest.status}</Badge>}
    >
      <div>
        <h3 className="font-bold text-text">{currentQuest.title}</h3>
        <p className="mt-1 text-sm text-muted">{currentQuest.description}</p>
      </div>
      <div className="text-sm">
        <p className="font-semibold text-text">Objective</p>
        <p className="text-muted">{currentQuest.objectiveLabel}</p>
      </div>
      <div className="text-sm">
        <p className="font-semibold text-text">Reward</p>
        <p className="text-muted">{formatQuestReward(currentQuest.rewards)}</p>
      </div>
      {claimMutation.isError ? (
        <p className="text-sm font-semibold text-danger">{claimMutation.error.message}</p>
      ) : null}
      {isCompleted ? (
        <Button
          variant="primary"
          className="w-full"
          disabled={claimMutation.isPending}
          onClick={() => claimMutation.mutate(currentQuest.id)}
        >
          {claimMutation.isPending ? 'Claiming...' : 'Claim Reward'}
        </Button>
      ) : null}
    </Panel>
  );
}
