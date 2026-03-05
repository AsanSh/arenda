/** Договор аренды — contracts.Contract */

import type { Accrual } from './accrual';

export interface Contract {
  id: number;
  number: string;
  signed_at: string;
  property: number;
  property_name?: string;
  property_address?: string;
  tenant: number;
  tenant_name?: string;
  landlord?: number | null;
  start_date: string;
  end_date: string;
  rent_amount: string;
  currency: string;
  exchange_rate_source?: string;
  due_day?: number;
  deposit_enabled: boolean;
  deposit_amount?: string;
  advance_enabled: boolean;
  advance_months?: number;
  status: 'draft' | 'active' | 'ended' | 'cancelled';
  comment?: string;
  created_at?: string;
}

export interface ContractDetail extends Contract {
  property_object?: { id: number; name?: string; address?: string };
  tenant_object?: { id: number; name: string };
  accruals?: Accrual[];
}
