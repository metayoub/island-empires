const SECONDS_PER_MINUTE = 60;
const SECONDS_PER_HOUR = 60 * SECONDS_PER_MINUTE;
const SECONDS_PER_DAY = 24 * SECONDS_PER_HOUR;

export function formatRemainingTime(totalSeconds: number): string {
  const safeSeconds = Math.max(0, Math.floor(totalSeconds));
  const days = Math.floor(safeSeconds / SECONDS_PER_DAY);
  const hours = Math.floor((safeSeconds % SECONDS_PER_DAY) / SECONDS_PER_HOUR);
  const minutes = Math.floor((safeSeconds % SECONDS_PER_HOUR) / SECONDS_PER_MINUTE);
  const seconds = safeSeconds % SECONDS_PER_MINUTE;

  if (days > 0) {
    return [`${days}d`, hours > 0 ? `${hours}h` : null, minutes > 0 ? `${minutes}m` : null]
      .filter(Boolean)
      .join(' ');
  }

  if (hours > 0) {
    return [`${hours}h`, minutes > 0 ? `${minutes}m` : null].filter(Boolean).join(' ');
  }

  if (minutes > 0) {
    return [`${minutes}m`, seconds > 0 ? `${seconds}s` : null].filter(Boolean).join(' ');
  }

  return `${seconds}s`;
}
