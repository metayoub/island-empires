import type { NextRecommendedAction } from '@island-empires/shared-types';
import { apiGet } from '../../services/api/client';

export async function getNextAction(): Promise<NextRecommendedAction> {
  const response = await apiGet<{ action: NextRecommendedAction }>('/api/guide/next-action');

  return response.action;
}
