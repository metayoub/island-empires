import { useEffect, useState } from 'react';

type TimerProps = {
  finishesAt: string;
  onComplete?: () => void;
  completingLabel?: string;
};

function getRemainingSeconds(finishesAt: string): number {
  return Math.max(0, Math.ceil((new Date(finishesAt).getTime() - Date.now()) / 1000));
}

function formatRemaining(totalSeconds: number): string {
  const days = Math.floor(totalSeconds / 86400);
  const hours = Math.floor((totalSeconds % 86400) / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;

  if (days > 0) {
    return `${days}d ${hours}h`;
  }
  if (hours > 0) {
    return `${hours}h ${minutes}m`;
  }

  return `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
}

export function Timer({ finishesAt, onComplete, completingLabel = 'Completing...' }: TimerProps) {
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
    <span className="font-mono text-sm font-bold text-text">
      {remainingSeconds > 0 ? formatRemaining(remainingSeconds) : completingLabel}
    </span>
  );
}
