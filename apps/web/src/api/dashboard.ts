import type { ApiResponse, DashboardLayout } from '@shared/types';
import { api } from './index';

export async function getLayout(): Promise<DashboardLayout> {
  const response = await api().get<ApiResponse<DashboardLayout>>('/dashboard/layout');
  return response.data.data;
}

export async function saveLayout(layout: DashboardLayout): Promise<DashboardLayout> {
  const response = await api().put<ApiResponse<DashboardLayout>>('/dashboard/layout', layout);
  return response.data.data;
}
