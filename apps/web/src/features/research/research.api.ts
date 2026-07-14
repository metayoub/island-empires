import type { ResearchOverview, StartResearchResponse } from '@island-empires/shared-types';
import { apiGet, apiPost } from '../../services/api/client';

export function getResearchOverview(): Promise<ResearchOverview> {
  return apiGet<ResearchOverview>('/api/research');
}

export function startResearch(technologyId: string): Promise<StartResearchResponse> {
  return apiPost<StartResearchResponse>(`/api/research/${technologyId}/start`, {});
}
