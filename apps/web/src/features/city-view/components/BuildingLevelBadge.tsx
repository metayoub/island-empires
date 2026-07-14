type BuildingLevelBadgeProps = {
  level: number;
};

export function BuildingLevelBadge({ level }: BuildingLevelBadgeProps) {
  if (level <= 0) {
    return null;
  }

  return (
    <span className="absolute -right-2 -top-2 rounded-full border border-border bg-surface px-2 py-0.5 text-xs font-bold text-text shadow-sm">
      Lv {level}
    </span>
  );
}
