import type { ButtonHTMLAttributes } from 'react';

type ButtonVariant = 'primary' | 'secondary' | 'ghost' | 'danger';

type ButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: ButtonVariant;
};

const VARIANT_CLASSES: Record<ButtonVariant, string> = {
  primary:
    'border-primary bg-primary text-white shadow-sm hover:bg-primary-hover hover:shadow-md disabled:border-border disabled:bg-surface-strong disabled:text-muted disabled:shadow-none',
  secondary:
    'border-border bg-surface-strong text-text shadow-sm hover:border-secondary/50 hover:bg-border hover:shadow-md disabled:bg-surface disabled:text-muted disabled:shadow-none',
  ghost:
    'border-transparent bg-transparent text-primary hover:border-border hover:bg-surface-strong disabled:text-muted',
  danger:
    'border-danger bg-danger text-white shadow-sm hover:opacity-90 hover:shadow-md disabled:border-border disabled:bg-surface-strong disabled:text-muted disabled:shadow-none',
};

export function Button({ variant = 'primary', className = '', type = 'button', ...props }: ButtonProps) {
  return (
    <button
      type={type}
      className={`rounded-md border px-4 py-2 text-sm font-semibold transition-all duration-150 active:translate-y-px disabled:cursor-not-allowed disabled:active:translate-y-0 ${VARIANT_CLASSES[variant]} ${className}`}
      {...props}
    />
  );
}
