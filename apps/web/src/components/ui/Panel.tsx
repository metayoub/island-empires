import type { ReactNode } from 'react';
import { Card } from './Card';
import { SectionHeader } from './SectionHeader';

type PanelProps = {
  title: string;
  subtitle?: string;
  action?: ReactNode;
  children: ReactNode;
  className?: string;
};

export function Panel({ title, subtitle, action, children, className = '' }: PanelProps) {
  return (
    <Card className={`space-y-4 ${className}`}>
      <SectionHeader title={title} subtitle={subtitle} action={action} />
      {children}
    </Card>
  );
}
