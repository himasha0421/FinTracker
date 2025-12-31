import { queryOptions } from '@tanstack/react-query';
import { apiClient } from '@/services/apiClient';
import type { Account, FinancialGoal } from '@shared/schema';

export type GoalResponse = FinancialGoal & { linkedAccounts?: Account[] };
export type GoalPayload = Omit<FinancialGoal, 'id'> & {
  linkedAccountIds?: number[];
};
export type UpdateGoalPayload = Partial<Omit<FinancialGoal, 'id'>> & {
  linkedAccountIds?: number[];
};

export const goalKeys = {
  all: ['goals'] as const,
  detail: (id: number) => ['goals', id] as const,
};

export function goalsListQuery() {
  return queryOptions<GoalResponse[]>({
    queryKey: goalKeys.all,
    queryFn: () => apiClient<GoalResponse[]>('/api/goals'),
  });
}

export function goalDetailQuery(id: number) {
  return queryOptions<GoalResponse>({
    queryKey: goalKeys.detail(id),
    queryFn: () => apiClient<GoalResponse>(`/api/goals/${id}`),
  });
}

export function createGoal(data: GoalPayload) {
  return apiClient<GoalResponse>('/api/goals', { method: 'POST', data });
}

export function updateGoal(id: number, data: UpdateGoalPayload) {
  return apiClient<GoalResponse>(`/api/goals/${id}`, { method: 'PATCH', data });
}

export function deleteGoal(id: number) {
  return apiClient<void>(`/api/goals/${id}`, { method: 'DELETE' });
}
