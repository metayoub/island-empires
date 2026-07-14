import type { HealthStatus } from '@island-empires/shared-types';
import { apiGet } from '../../services/api/client';

export function getHealth(): Promise<HealthStatus> {
  return apiGet<HealthStatus>('/api/health');
}

