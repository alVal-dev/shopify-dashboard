import type { AnalyticsSnapshot, ApiResponse } from '@shared/types';
import { api } from './index';

export async function getAnalytics(): Promise<AnalyticsSnapshot> {
  const response = await api().get<ApiResponse<AnalyticsSnapshot>>('/analytics');
  return response.data.data;
}
