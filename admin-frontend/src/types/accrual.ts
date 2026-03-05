/** Начисление — accruals.Accrual */

export interface Accrual {
  id: number;
  contract: number;
  period_start: string;
  period_end: string;
  due_date: string;
  base_amount: string;
  final_amount: string;
  status: string;
  balance?: string;
  paid_amount?: string;
  created_at?: string;
}
