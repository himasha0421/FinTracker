import { queryOptions } from '@tanstack/react-query';
import { apiClient } from '@/services/apiClient';
import type { FinancialGoal } from '@shared/schema';

export const goalKeys = {
  all: ['goals'] as const,
  detail: (id: number) => ['goals', id] as const,
};

export function goalsListQuery() {
  return queryOptions<FinancialGoal[]>({
    queryKey: goalKeys.all,
    queryFn: () => apiClient<FinancialGoal[]>('/api/goals'),
  });
}

export function goalDetailQuery(id: number) {
  return queryOptions<FinancialGoal>({
    queryKey: goalKeys.detail(id),
    queryFn: () => apiClient<FinancialGoal>(`/api/goals/${id}`),
  });
}

export function createGoal(data: Omit<FinancialGoal, 'id'>) {
  return apiClient<FinancialGoal>('/api/goals', { method: 'POST', data });
}

export function updateGoal(id: number, data: Partial<Omit<FinancialGoal, 'id'>>) {
  return apiClient<FinancialGoal>(`/api/goals/${id}`, { method: 'PATCH', data });
}

export function deleteGoal(id: number) {
  return apiClient<void>(`/api/goals/${id}`, { method: 'DELETE' });
}
