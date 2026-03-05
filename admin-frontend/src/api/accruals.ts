/**
 * API начислений — явные функции вместо прямых вызовов client.
 */
import client from './client';
import type { Accrual } from '../types';

export interface AccrualListParams {
  status?: string;
  utility_type?: string;
  contract__tenant?: number | number[];
  search?: string;
  due_date_from?: string;
  due_date_to?: string;
  ordering?: string;
}

function buildParams(params: Record<string, string | number | number[] | undefined>): string {
  const search = new URLSearchParams();
  Object.entries(params).forEach(([key, value]) => {
    if (value === undefined || value === '') return;
    if (Array.isArray(value)) {
      value.forEach((v) => search.append(key, String(v)));
    } else {
      search.append(key, String(value));
    }
  });
  const q = search.toString();
  return q ? `?${q}` : '';
}

export async function fetchAccrualList(params: AccrualListParams = {}): Promise<Accrual[]> {
  const response = await client.get<Accrual[] | { results?: Accrual[] }>(`/accruals/${buildParams(params as Record<string, string | number | number[] | undefined>)}`);
  const data = response.data;
  return Array.isArray(data) ? data : ((data as { results?: Accrual[] }).results ?? []);
}

export async function fetchAccrual(id: number): Promise<Accrual> {
  const response = await client.get<Accrual>(`/accruals/${id}/`);
  return response.data;
}

export async function createAccrual(payload: Partial<Accrual>): Promise<Accrual> {
  const response = await client.post<Accrual>('/accruals/', payload);
  return response.data;
}

export async function updateAccrual(id: number, payload: Partial<Accrual>): Promise<Accrual> {
  const response = await client.patch<Accrual>(`/accruals/${id}/`, payload);
  return response.data;
}

export async function deleteAccrual(id: number): Promise<void> {
  await client.delete(`/accruals/${id}/`);
}

export async function acceptAccrual(id: number, data: { account_id: number; amount?: string }): Promise<unknown> {
  const response = await client.post(`/accruals/${id}/accept/`, data);
  return response.data;
}

export async function recalculateAccrual(id: number): Promise<{ status: string }> {
  const response = await client.post<{ status: string }>(`/accruals/${id}/recalculate/`);
  return response.data;
}

export async function cancelPaymentAccrual(id: number): Promise<unknown> {
  const response = await client.post(`/accruals/${id}/cancel_payment/`);
  return response.data;
}

export async function bulkUpdateAccruals(updateData: { accrual_ids: number[]; [key: string]: unknown }): Promise<unknown> {
  const response = await client.post('/accruals/bulk_update/', updateData);
  return response.data;
}

export async function bulkDeleteAccruals(accrualIds: number[]): Promise<unknown> {
  const response = await client.post('/accruals/bulk_delete/', { accrual_ids: accrualIds });
  return response.data;
}

export async function bulkAcceptAccruals(payload: { accrual_ids: number[]; account_id: number }): Promise<unknown> {
  const response = await client.post('/accruals/bulk_accept/', payload);
  return response.data;
}
