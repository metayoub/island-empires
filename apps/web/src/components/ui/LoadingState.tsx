import { Skeleton } from './Skeleton';

type LoadingStateProps = {
  message?: string;
};

export function LoadingState({ message = 'Loading...' }: LoadingStateProps) {
  return (
    <div className="space-y-3 rounded border border-border bg-surface p-6">
      <Skeleton className="h-4 w-1/3" />
      <Skeleton className="h-4 w-2/3" />
      <Skeleton className="h-4 w-1/2" />
      <p className="text-sm font-medium text-muted">{message}</p>
    </div>
  );
}
