import { useQuery } from '@tanstack/react-query';
import { Alert } from '../../components/ui/Alert';
import { ErrorState } from '../../components/ui/ErrorState';
import { LoadingState } from '../../components/ui/LoadingState';
import { Panel } from '../../components/ui/Panel';
import { QuestCard } from '../quests/components/QuestCard';
import { getQuestOverview } from '../quests/quests.api';
import { getNextAction } from './guide.api';

const GUIDE_SECTIONS = [
  {
    title: 'What is Island Empires?',
    body: 'A calm, long-term island strategy game where you grow a city over time.',
  },
  {
    title: 'Resources',
    body: 'Wood and Gold are produced by your workers and used to upgrade buildings.',
  },
  {
    title: 'Buildings',
    body: 'Upgrade buildings like the Warehouse and Academy to unlock new capabilities.',
  },
  {
    title: 'Population',
    body: 'Population grows over time and can be assigned as workers or scientists.',
  },
  {
    title: 'Happiness',
    body: 'Happiness reflects how content your citizens are. The Tavern helps keep them happy.',
  },
  {
    title: 'Workers',
    body: 'Assign citizens as wood workers, gold workers, or scientists.',
  },
  {
    title: 'Research',
    body: 'Scientists generate research points, which are used to unlock new technologies.',
  },
  {
    title: 'Timers and Offline Progression',
    body: 'Construction and research continue even while you are away from the game.',
  },
  {
    title: 'Coming Soon: World Map',
    body: 'A world map with islands, coordinates, and travel is coming in a future sprint.',
  },
];

export function GuidePage() {
  const questsQuery = useQuery({ queryKey: ['quest-overview'], queryFn: getQuestOverview, retry: 1 });
  const nextActionQuery = useQuery({ queryKey: ['next-action'], queryFn: getNextAction, retry: 1 });

  return (
    <div className="space-y-6">
      {nextActionQuery.data ? (
        <Alert variant="info">
          <p className="font-bold">Next: {nextActionQuery.data.title}</p>
          <p className="mt-1 font-normal">{nextActionQuery.data.description}</p>
        </Alert>
      ) : null}

      <Panel title="Tutorial Quests" subtitle="Follow these quests to learn the core loop.">
        {questsQuery.isLoading ? (
          <LoadingState message="Loading quests..." />
        ) : questsQuery.isError || !questsQuery.data ? (
          <ErrorState onRetry={() => void questsQuery.refetch()} />
        ) : (
          <div className="grid gap-4 sm:grid-cols-2">
            {questsQuery.data.quests.map((quest) => (
              <QuestCard key={quest.id} quest={quest} />
            ))}
          </div>
        )}
      </Panel>

      <Panel title="Game Guide">
        <div className="space-y-4">
          {GUIDE_SECTIONS.map((section) => (
            <div key={section.title}>
              <h3 className="font-bold text-text">{section.title}</h3>
              <p className="mt-1 text-sm text-muted">{section.body}</p>
            </div>
          ))}
        </div>
      </Panel>
    </div>
  );
}
