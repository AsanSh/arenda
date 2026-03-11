/**
 * API аналитики по объектам.
 * Доступен при FEATURE_ANALYTICS=true.
 */
import client from './client';

export interface PropertyAnalyticsItem {
  id: number;
  name: string;
  total_accrued: string;
  total_paid: string;
  outstanding_debt: string;
  overdue_amount?: string;
  deposit_held?: string;
  expenses?: string;
  net_cashflow?: string;
  collection_rate?: string;
}

export interface PropertyAnalyticsSummary {
  total_accrued: string;
  total_paid: string;
  outstanding_debt: string;
  overdue_amount: string;
  deposit_held: string;
  expenses: string;
  net_cashflow: string;
  collection_rate: string;
  properties?: PropertyAnalyticsItem[];
}

export interface PropertyAnalyticsParams {
  property_id?: number;
  from?: string;
  to?: string;
}

export async function fetchPropertyAnalyticsSummary(
  params: PropertyAnalyticsParams = {}
): Promise<PropertyAnalyticsSummary> {
  const search = new URLSearchParams();
  if (params.property_id != null) search.append('property_id', String(params.property_id));
  if (params.from) search.append('from', params.from);
  if (params.to) search.append('to', params.to);
  const qs = search.toString();
  const response = await client.get<PropertyAnalyticsSummary>(
    `/analytics/properties/summary/${qs ? '?' + qs : ''}`
  );
  return response.data;
}
