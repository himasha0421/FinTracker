import type {
  BracketSlice,
  TaxPlanInput,
  TaxPersonResult,
} from '@shared/taxPlanning';

export type PlanDraft = TaxPlanInput & { id: number };

export type CombinedSlice = BracketSlice & { fedRate: number; provRate: number };

export interface WaterfallStep {
  income: number;
  label: string;
  breakdown: BracketSlice[];
  deductionLabel?: string;
  deductionAmount?: number;
}

export type { TaxPersonResult };
