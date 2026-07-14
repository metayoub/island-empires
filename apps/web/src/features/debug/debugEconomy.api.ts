import type { DebugEconomyDashboardResponse } from '@island-empires/shared-types';
import { apiGet } from '../../services/api/client';

export function getDebugEconomyDashboard() {
  return apiGet<DebugEconomyDashboardResponse>('/api/debug/economy');
}
