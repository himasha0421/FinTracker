import { queryOptions } from '@tanstack/react-query';
import { apiClient } from '@/services/apiClient';
import type { TaxPlanBundle, TaxPlanInput, TaxPlanScenarioInput } from '@shared/taxPlanning';

export const taxPlanKeys = {
  all: ['tax-plans'] as const,
};

export function taxPlansListQuery() {
  return queryOptions<TaxPlanBundle[]>({
    queryKey: taxPlanKeys.all,
    queryFn: () => apiClient<TaxPlanBundle[]>('/api/tax-plans'),
  });
}

export function createDefaultTaxPlan() {
  return apiClient<TaxPlanBundle>('/api/tax-plans/default', { method: 'POST' });
}

export function createTaxPlan(data: TaxPlanInput) {
  return apiClient<TaxPlanBundle>('/api/tax-plans', { method: 'POST', data });
}

export function updateTaxPlan(id: number, data: TaxPlanInput) {
  return apiClient<TaxPlanBundle>(`/api/tax-plans/${id}`, { method: 'PATCH', data });
}

export function deleteTaxPlan(id: number) {
  return apiClient<void>(`/api/tax-plans/${id}`, { method: 'DELETE' });
}

export function createTaxPlanScenario(planId: number, data: TaxPlanScenarioInput) {
  return apiClient<TaxPlanBundle>(`/api/tax-plans/${planId}/scenarios`, {
    method: 'POST',
    data,
  });
}

export function updateTaxPlanScenario(
  planId: number,
  scenarioId: number,
  data: TaxPlanScenarioInput
) {
  return apiClient<TaxPlanBundle>(`/api/tax-plans/${planId}/scenarios/${scenarioId}`, {
    method: 'PATCH',
    data,
  });
}

export function deleteTaxPlanScenario(planId: number, scenarioId: number) {
  return apiClient<TaxPlanBundle>(`/api/tax-plans/${planId}/scenarios/${scenarioId}`, {
    method: 'DELETE',
  });
}
