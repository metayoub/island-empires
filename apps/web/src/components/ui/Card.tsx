import type { ReactNode } from 'react';

type CardProps = {
  children: ReactNode;
  className?: string;
};

export function Card({ children, className = '' }: CardProps) {
  return (
    <div className={`game-surface game-frame rounded-lg p-4 ${className}`}>{children}</div>
  );
}
