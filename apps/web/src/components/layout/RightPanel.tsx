import { ActiveTimersPanel } from '../../features/quests/components/ActiveTimersPanel';
import { TutorialPanel } from '../../features/quests/components/TutorialPanel';

export function RightPanel() {
  return (
    <aside className="space-y-6">
      <TutorialPanel />
      <ActiveTimersPanel />
    </aside>
  );
}
