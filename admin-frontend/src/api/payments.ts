/**
 * API платежей — явные функции вместо прямых вызовов client.
 */
import client from './client';
import type { Payment } from '../types';

export interface PaymentListParams {
  contract?: number;
  contract__tenant?: number | number[];
  contract__property?: number;
  search?: string;
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

export async function fetchPaymentList(params: PaymentListParams = {}): Promise<Payment[]> {
  const response = await client.get<Payment[] | { results?: Payment[] }>(`/payments/${buildParams(params as Record<string, string | number | number[] | undefined>)}`);
  const data = response.data;
  return Array.isArray(data) ? data : ((data as { results?: Payment[] }).results ?? []);
}

export async function fetchPayment(id: number): Promise<Payment> {
  const response = await client.get<Payment>(`/payments/${id}/`);
  return response.data;
}

export async function createPayment(payload: Partial<Payment>): Promise<Payment> {
  const response = await client.post<Payment>('/payments/', payload);
  return response.data;
}

export async function updatePayment(id: number, payload: Partial<Payment>): Promise<Payment> {
  const response = await client.patch<Payment>(`/payments/${id}/`, payload);
  return response.data;
}

export async function deletePayment(id: number): Promise<void> {
  await client.delete(`/payments/${id}/`);
}

export async function returnPayment(id: number): Promise<unknown> {
  const response = await client.post(`/payments/${id}/return_payment/`);
  return response.data;
}
