/** Платёж — payments.Payment */

export interface Payment {
  id: number;
  contract: number;
  account?: number | null;
  amount: string;
  payment_date: string;
  comment?: string;
  allocated_amount?: string;
  is_returned?: boolean;
  created_at?: string;
}
