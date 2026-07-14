import { Alert } from './Alert';
import { Button } from './Button';

type ErrorStateProps = {
  title?: string;
  message?: string;
  onRetry?: () => void;
};

export function ErrorState({
  title = 'Something went wrong.',
  message = 'Please try again.',
  onRetry,
}: ErrorStateProps) {
  return (
    <Alert variant="danger">
      <p className="font-bold">{title}</p>
      <p className="mt-1 font-normal">{message}</p>
      {onRetry ? (
        <Button variant="secondary" className="mt-3" onClick={onRetry}>
          Retry
        </Button>
      ) : null}
    </Alert>
  );
}
