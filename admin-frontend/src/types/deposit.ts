/** Депозит — deposits.Deposit */

export interface Deposit {
  id: number;
  contract: number;
  amount: string;
  balance: string;
  created_at?: string;
}
