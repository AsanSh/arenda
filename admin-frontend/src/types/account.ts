/** Бухгалтерский счёт — accounts.Account */

export interface Account {
  id: number;
  name: string;
  account_type?: string;
  currency: string;
  balance: string;
  owner?: number;
  is_active?: boolean;
}
