import { queryOptions } from '@tanstack/react-query';
import { apiClient } from '@/services/apiClient';
import type {
  CreateContributionPayload,
  CreateInvestmentPayload,
  UpdateContributionPayload,
  UpdateInvestmentPayload,
  InvestmentItem,
  InvestmentContributionItem,
} from './types';

export const investmentKeys = {
  all: ['investments'] as const,
  detail: (id: number) => ['investments', id] as const,
};

export const investmentContributionKeys = {
  all: ['investment-contributions'] as const,
  byInvestment: (investmentId?: number) =>
    ['investment-contributions', { investmentId: investmentId ?? null }] as const,
  detail: (id: number) => ['investment-contributions', id] as const,
};

export function investmentsListQuery() {
  return queryOptions<InvestmentItem[]>({
    queryKey: investmentKeys.all,
    queryFn: () => apiClient<InvestmentItem[]>('/api/investments'),
  });
}

export function investmentDetailQuery(id: number) {
  return queryOptions<InvestmentItem>({
    queryKey: investmentKeys.detail(id),
    queryFn: () => apiClient<InvestmentItem>(`/api/investments/${id}`),
  });
}

export function investmentContributionsListQuery(investmentId?: number) {
  const queryKey =
    investmentId === undefined
      ? investmentContributionKeys.all
      : investmentContributionKeys.byInvestment(investmentId);
  return queryOptions<InvestmentContributionItem[]>({
    queryKey,
    queryFn: () =>
      apiClient<InvestmentContributionItem[]>('/api/investment-contributions', {
        query: { investmentId },
      }),
  });
}

export function createInvestment(data: CreateInvestmentPayload) {
  return apiClient<InvestmentItem>('/api/investments', { method: 'POST', data });
}

export function updateInvestment(id: number, data: UpdateInvestmentPayload) {
  return apiClient<InvestmentItem>(`/api/investments/${id}`, { method: 'PATCH', data });
}

export function deleteInvestment(id: number) {
  return apiClient<void>(`/api/investments/${id}`, { method: 'DELETE' });
}

export function createInvestmentContribution(data: CreateContributionPayload) {
  return apiClient<InvestmentContributionItem>('/api/investment-contributions', {
    method: 'POST',
    data,
  });
}

export function updateInvestmentContribution(id: number, data: UpdateContributionPayload) {
  return apiClient<InvestmentContributionItem>(`/api/investment-contributions/${id}`, {
    method: 'PATCH',
    data,
  });
}

export function deleteInvestmentContribution(id: number) {
  return apiClient<void>(`/api/investment-contributions/${id}`, { method: 'DELETE' });
}
