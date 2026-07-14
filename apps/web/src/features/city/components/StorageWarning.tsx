import { RESOURCE_LABELS } from '@island-empires/config';
import type { StorageSummary } from '@island-empires/shared-types';
import { Alert } from '../../../components/ui/Alert';

type StorageWarningProps = {
  storage: StorageSummary;
};

export function StorageWarning({ storage }: StorageWarningProps) {
  if (storage.fullResources.length === 0) {
    return null;
  }

  const labels = storage.fullResources
    .map((resourceType) => RESOURCE_LABELS[resourceType as keyof typeof RESOURCE_LABELS] ?? resourceType)
    .join(', ');

  return (
    <Alert variant="warning">
      <p>Storage is full for {labels}.</p>
      <p className="mt-1 font-normal">
        Future production is paused until you spend resources or increase storage. Warehouse
        upgrades will help in a future sprint.
      </p>
    </Alert>
  );
}
