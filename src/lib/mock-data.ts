import { Transaction, BalanceBreakdown } from '@/types';

export const sleep = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

export const mockBalance: BalanceBreakdown = {
  available: 124567,
  pending: 5000,
  onHold: 12500,
  total: 142067,
};

export const mockTransactions: Transaction[] = [
  {
    id: 'txn_001',
    type: 'COMMERCE_PAYOUT',
    counterparty: 'Meta Commerce',
    amount: 45000,
    fee: 1350,
    status: 'COMPLETED',
    date: '2025-01-10T14:30:00Z',
    fundingSource: { type: 'BALANCE', last4: '0000' },
    memo: 'Payment for goods sold',
    isGoodsSold: true,
  },
  {
    id: 'txn_002',
    type: 'RECEIVED',
    counterparty: 'Sarah Johnson',
    amount: 7500,
    fee: 0,
    status: 'COMPLETED',
    date: '2025-01-09T10:15:00Z',
    fundingSource: { type: 'CARD', last4: '4242' },
    isGoodsSold: false,
  },
  {
    id: 'txn_003',
    type: 'SENT',
    counterparty: 'Michael Chen',
    amount: -2500,
    fee: 0,
    status: 'COMPLETED',
    date: '2025-01-08T16:45:00Z',
    fundingSource: { type: 'BALANCE', last4: '0000' },
    memo: 'Dinner split',
    isGoodsSold: false,
  },
  {
    id: 'txn_004',
    type: 'COMMERCE_PAYOUT',
    counterparty: 'Meta Commerce',
    amount: 128000,
    fee: 3840,
    status: 'PENDING',
    date: '2025-01-08T09:00:00Z',
    fundingSource: { type: 'BALANCE', last4: '0000' },
    memo: 'Payment for goods sold',
    isGoodsSold: true,
  },
  {
    id: 'txn_005',
    type: 'RECEIVED',
    counterparty: 'Emma Davis',
    amount: 15000,
    fee: 0,
    status: 'COMPLETED',
    date: '2025-01-07T11:20:00Z',
    fundingSource: { type: 'BANK', last4: '6789' },
    isGoodsSold: false,
  },
  {
    id: 'txn_006',
    type: 'SENT',
    counterparty: 'James Wilson',
    amount: -5000,
    fee: 0,
    status: 'COMPLETED',
    date: '2025-01-06T14:30:00Z',
    fundingSource: { type: 'CARD', last4: '1234' },
    memo: 'Concert tickets',
    isGoodsSold: false,
  },
  {
    id: 'txn_007',
    type: 'RECEIVED',
    counterparty: 'Olivia Martinez',
    amount: 3200,
    fee: 0,
    status: 'COMPLETED',
    date: '2025-01-05T08:15:00Z',
    fundingSource: { type: 'BALANCE', last4: '0000' },
    isGoodsSold: false,
  },
  {
    id: 'txn_008',
    type: 'COMMERCE_PAYOUT',
    counterparty: 'Meta Commerce',
    amount: 67500,
    fee: 2025,
    status: 'COMPLETED',
    date: '2025-01-04T13:00:00Z',
    fundingSource: { type: 'BALANCE', last4: '0000' },
    memo: 'Payment for goods sold',
    isGoodsSold: true,
  },
];

export const formatCurrency = (amountInCents: number): string => {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
  }).format(amountInCents / 100);
};

export const formatDate = (isoDate: string): string => {
  return new Date(isoDate).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
};
