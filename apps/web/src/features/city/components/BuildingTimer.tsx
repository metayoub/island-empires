import { useEffect, useState } from 'react';

type BuildingTimerProps = {
  finishesAt: string;
  onComplete?: () => void;
};

function formatRemaining(totalSeconds: number): string {
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;

  return `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
}

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
      {remainingSeconds > 0 ? formatRemaining(remainingSeconds) : 'Completing...'}
    </span>
  );
}
