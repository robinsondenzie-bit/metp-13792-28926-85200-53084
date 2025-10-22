export type TxnType = 'SENT' | 'RECEIVED' | 'COMMERCE_PAYOUT';

export interface Transaction {
  id: string;
  type: TxnType;
  counterparty: string;
  amount: number;
  fee: number;
  status: 'COMPLETED' | 'PENDING' | 'FAILED';
  date: string;
  fundingSource: { type: 'CARD' | 'BANK' | 'BALANCE'; last4: string };
  memo?: string;
  isGoodsSold: boolean;
}

export interface BalanceBreakdown {
  available: number;
  pending: number;
  onHold: number;
  total: number;
}
