import { useEffect, useState } from 'react';
import { formatRemainingTime } from '../../../utils/time';

type BuildingTimerProps = {
  finishesAt: string;
  onComplete?: () => void;
};

function getRemainingSeconds(finishesAt: string): number {
  return Math.max(0, Math.ceil((new Date(finishesAt).getTime() - Date.now()) / 1000));
}

export function BuildingTimer({ finishesAt, onComplete }: BuildingTimerProps) {
  const [remainingSeconds, setRemainingSeconds] = useState(() => getRemainingSeconds(finishesAt));

  useEffect(() => {
    setRemainingSeconds(getRemainingSeconds(finishesAt));
    const interval = window.setInterval(() => {
      const nextRemainingSeconds = getRemainingSeconds(finishesAt);
      setRemainingSeconds(nextRemainingSeconds);

      if (nextRemainingSeconds === 0) {
        onComplete?.();
      }
    }, 1000);

    return () => window.clearInterval(interval);
  }, [finishesAt, onComplete]);

  return (
    <span className="font-mono text-sm font-black text-text">
      {remainingSeconds > 0 ? formatRemainingTime(remainingSeconds) : 'Completing...'}
    </span>
  );
}
