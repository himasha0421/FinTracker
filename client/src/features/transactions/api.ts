import { queryOptions } from '@tanstack/react-query';
import { apiClient } from '@/services/apiClient';
import type { Transaction } from '@shared/schema';

export const transactionKeys = {
  all: ['transactions'] as const,
  list: (limit?: number) => ['transactions', { limit: limit ?? null }] as const,
  detail: (id: number) => ['transactions', id] as const,
  byAccount: (accountId: number) => ['transactions', 'account', accountId] as const,
};

export function transactionsListQuery(limit?: number) {
  return queryOptions<Transaction[]>({
    queryKey: transactionKeys.list(limit),
    queryFn: () => apiClient<Transaction[]>('/api/transactions', { query: { limit } }),
  });
}

export function transactionsByAccountQuery(accountId: number) {
  return queryOptions<Transaction[]>({
    queryKey: transactionKeys.byAccount(accountId),
    queryFn: () => apiClient<Transaction[]>(`/api/accounts/${accountId}/transactions`),
  });
}

export function transactionDetailQuery(id: number) {
  return queryOptions<Transaction>({
    queryKey: transactionKeys.detail(id),
    queryFn: () => apiClient<Transaction>(`/api/transactions/${id}`),
  });
}

export function createTransaction(data: Omit<Transaction, 'id'>) {
  return apiClient<Transaction>('/api/transactions', { method: 'POST', data });
}

export function updateTransaction(id: number, data: Partial<Omit<Transaction, 'id'>>) {
  return apiClient<Transaction>(`/api/transactions/${id}`, { method: 'PATCH', data });
}

export function deleteTransaction(id: number) {
  return apiClient<void>(`/api/transactions/${id}`, { method: 'DELETE' });
}
