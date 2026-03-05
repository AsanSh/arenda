/**
 * API договоров — явные функции вместо прямых вызовов client.
 * Базовый URL задаётся в client (например /api), пути относительные: /contracts/...
 */
import client from './client';
import type { Contract } from '../types';

export interface ContractListParams {
  status?: string;
  tenant?: number | number[];
  property?: number;
  search?: string;
  signed_at__gte?: string;
  signed_at__lte?: string;
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

export async function fetchContractList(params: ContractListParams = {}): Promise<Contract[]> {
  const { ordering, ...rest } = params;
  const query: Record<string, string | number | number[] | undefined> = { ...rest };
  if (params.ordering) query.ordering = params.ordering;
  const response = await client.get<Contract[] | { results?: Contract[] }>(`/contracts/${buildParams(query)}`);
  const data = response.data;
  return Array.isArray(data) ? data : ((data as { results?: Contract[] }).results ?? []);
}

export async function fetchContract(id: number): Promise<Contract> {
  const response = await client.get<Contract>(`/contracts/${id}/`);
  return response.data;
}

export async function createContract(payload: Partial<Contract>): Promise<Contract> {
  const response = await client.post<Contract>('/contracts/', payload);
  return response.data;
}

export async function updateContract(id: number, payload: Partial<Contract>): Promise<Contract> {
  const response = await client.patch<Contract>(`/contracts/${id}/`, payload);
  return response.data;
}

export async function deleteContract(id: number): Promise<void> {
  await client.delete(`/contracts/${id}/`);
}

export async function endContract(id: number): Promise<{ status: string }> {
  const response = await client.post<{ status: string }>(`/contracts/${id}/end_contract/`);
  return response.data;
}

export async function generateAccruals(id: number): Promise<{ status: string }> {
  const response = await client.post<{ status: string }>(`/contracts/${id}/generate_accruals/`);
  return response.data;
}

export interface ContractFile {
  id: number;
  file_type: 'contract' | 'supplement' | 'other';
  file: string;
  file_url: string;
  title: string;
  created_at: string;
}

export async function fetchContractFiles(contractId: number): Promise<ContractFile[]> {
  const response = await client.get<ContractFile[]>(`/contracts/${contractId}/files/`);
  return response.data;
}

export async function uploadContractFile(
  contractId: number,
  file: File,
  fileType: 'contract' | 'supplement' | 'other' = 'contract',
  title?: string
): Promise<ContractFile> {
  const formData = new FormData();
  formData.append('file', file);
  formData.append('file_type', fileType);
  if (title) formData.append('title', title);
  const response = await client.post<ContractFile>(`/contracts/${contractId}/files/`, formData);
  return response.data;
}

export async function deleteContractFile(contractId: number, fileId: number): Promise<void> {
  await client.delete(`/contracts/${contractId}/files/`, { data: { file_id: fileId } });
}

/** Скачать файл (возвращает blob для создания ссылки) */
export async function downloadContractFile(
  contractId: number,
  fileId: number
): Promise<Blob> {
  const response = await client.get(
    `/contracts/${contractId}/files/${fileId}/download/`,
    { responseType: 'blob' }
  );
  return response.data;
}
