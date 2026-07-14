import type { ReactNode } from 'react';

type AlertVariant = 'info' | 'success' | 'warning' | 'danger';

type AlertProps = {
  variant?: AlertVariant;
  children: ReactNode;
};

const VARIANT_CLASSES: Record<AlertVariant, string> = {
  info: 'border-primary/30 bg-primary/10 text-primary',
  success: 'border-success/30 bg-success/10 text-success',
  warning: 'border-warning/30 bg-warning/10 text-warning',
  danger: 'border-danger/30 bg-danger/10 text-danger',
};

export function Alert({ variant = 'info', children }: AlertProps) {
  return (
    <div role="alert" className={`rounded border p-4 text-sm font-semibold ${VARIANT_CLASSES[variant]}`}>
      {children}
    </div>
  );
}
