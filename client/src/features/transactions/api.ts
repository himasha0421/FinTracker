import { queryOptions } from '@tanstack/react-query';
import { apiClient } from '@/services/apiClient';
import type {
  TransactionWithAssignments,
  CreateTransactionPayload,
  UpdateTransactionPayload,
} from '@/features/transactions/types';

export const transactionKeys = {
  all: ['transactions'] as const,
  list: (limit?: number) => ['transactions', { limit: limit ?? null }] as const,
  detail: (id: number) => ['transactions', id] as const,
  byAccount: (accountId: number) => ['transactions', 'account', accountId] as const,
};

export function transactionsListQuery(limit?: number) {
  return queryOptions<TransactionWithAssignments[]>({
    queryKey: transactionKeys.list(limit),
    queryFn: () => apiClient<TransactionWithAssignments[]>('/api/transactions', { query: { limit } }),
  });
}

export function transactionsByAccountQuery(accountId: number) {
  return queryOptions<TransactionWithAssignments[]>({
    queryKey: transactionKeys.byAccount(accountId),
    queryFn: () => apiClient<TransactionWithAssignments[]>(`/api/accounts/${accountId}/transactions`),
  });
}

export function transactionDetailQuery(id: number) {
  return queryOptions<TransactionWithAssignments>({
    queryKey: transactionKeys.detail(id),
    queryFn: () => apiClient<TransactionWithAssignments>(`/api/transactions/${id}`),
  });
}

export function createTransaction(data: CreateTransactionPayload) {
  return apiClient<TransactionWithAssignments>('/api/transactions', { method: 'POST', data });
}

export function updateTransaction(id: number, data: UpdateTransactionPayload) {
  return apiClient<TransactionWithAssignments>(`/api/transactions/${id}`, { method: 'PATCH', data });
}

export function deleteTransaction(id: number) {
  return apiClient<void>(`/api/transactions/${id}`, { method: 'DELETE' });
}
