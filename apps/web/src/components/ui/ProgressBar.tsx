type ProgressBarVariant = 'primary' | 'success' | 'warning' | 'danger';

type ProgressBarProps = {
  value: number;
  max: number;
  variant?: ProgressBarVariant;
};

const VARIANT_CLASSES: Record<ProgressBarVariant, string> = {
  primary: 'bg-primary',
  success: 'bg-success',
  warning: 'bg-warning',
  danger: 'bg-danger',
};

export function ProgressBar({ value, max, variant = 'primary' }: ProgressBarProps) {
  const percent = max > 0 ? Math.min(100, Math.max(0, (value / max) * 100)) : 0;

  return (
    <div
      className="h-2 w-full overflow-hidden rounded-full bg-surface-strong shadow-inner"
      role="progressbar"
      aria-valuenow={value}
      aria-valuemin={0}
      aria-valuemax={max}
    >
      <div
        className={`h-full rounded-full transition-all duration-500 ${VARIANT_CLASSES[variant]}`}
        style={{ width: `${percent}%` }}
      />
    </div>
  );
}
