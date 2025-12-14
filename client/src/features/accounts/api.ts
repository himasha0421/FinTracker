import { queryOptions } from '@tanstack/react-query';
import { apiClient } from '@/services/apiClient';
import type { Account } from '@shared/schema';

export const accountKeys = {
  all: ['accounts'] as const,
  detail: (id: number) => ['accounts', id] as const,
  balance: ['accounts', 'balance'] as const,
};

export function accountsListQuery() {
  return queryOptions<Account[]>({
    queryKey: accountKeys.all,
    queryFn: () => apiClient<Account[]>('/api/accounts'),
  });
}

export function accountDetailQuery(id: number) {
  return queryOptions<Account>({
    queryKey: accountKeys.detail(id),
    queryFn: () => apiClient<Account>(`/api/accounts/${id}`),
  });
}

export function totalBalanceQuery() {
  return queryOptions<{ balance: number }>({
    queryKey: accountKeys.balance,
    queryFn: () => apiClient<{ balance: number }>('/api/balance'),
  });
}

export function createAccount(data: Omit<Account, 'id'>) {
  return apiClient<Account>('/api/accounts', { method: 'POST', data });
}

export function updateAccount(id: number, data: Partial<Omit<Account, 'id'>>) {
  return apiClient<Account>(`/api/accounts/${id}`, { method: 'PATCH', data });
}

export function deleteAccount(id: number) {
  return apiClient<void>(`/api/accounts/${id}`, { method: 'DELETE' });
}
