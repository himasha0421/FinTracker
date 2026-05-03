import type { BracketSlice, TaxPlanBundle, TaxPersonResult } from '@shared/taxPlanning';
import type { CombinedSlice, PlanDraft } from './types';
import { currencyFormatter } from './constants';

export function clonePlan(bundle: TaxPlanBundle): PlanDraft {
  return {
    id: bundle.plan.id,
    name: bundle.plan.name,
    taxYear: bundle.plan.taxYear,
    province: bundle.plan.province,
    household: { ...bundle.plan.household },
    personA: { ...bundle.plan.personA },
    personB: { ...bundle.plan.personB },
  };
}

export function toDateInput(value: string | null): string {
  if (!value) return '';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '';
  return date.toISOString().split('T')[0];
}

export function fromDateInput(value: string): string | null {
  if (!value) return null;
  return new Date(`${value}T12:00:00.000Z`).toISOString();
}

export function toNumber(value: string): number {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
}

export function computeCombinedBreakdown(
  income: number,
  federalSlices: BracketSlice[],
  provincialSlices: BracketSlice[]
): CombinedSlice[] {
  const thresholds = Array.from(
    new Set([
      ...federalSlices.map(s => s.upTo).filter(t => isFinite(t)),
      ...provincialSlices.map(s => s.upTo).filter(t => isFinite(t)),
    ])
  ).sort((a, b) => a - b);
  thresholds.push(Infinity);

  let prev = 0;
  return thresholds.map(threshold => {
    const probe = prev + 1;
    const fedRate =
      federalSlices.find(s => probe <= s.upTo)?.rate ??
      federalSlices[federalSlices.length - 1].rate;
    const provRate =
      provincialSlices.find(s => probe <= s.upTo)?.rate ??
      provincialSlices[provincialSlices.length - 1].rate;
    const combinedRate = fedRate + provRate;
    const inBracket = Math.max(0, Math.min(income, threshold) - prev);
    prev = threshold;
    return {
      upTo: threshold,
      rate: combinedRate,
      fedRate,
      provRate,
      incomeInBracket: inBracket,
      taxInBracket: inBracket * combinedRate,
    };
  });
}

export function computeBreakdownForIncome(
  income: number,
  slices: BracketSlice[]
): BracketSlice[] {
  let prev = 0;
  return slices.map(s => {
    const top = Math.min(income, s.upTo);
    const inBracket = Math.max(0, top - prev);
    prev = s.upTo;
    return { upTo: s.upTo, rate: s.rate, incomeInBracket: inBracket, taxInBracket: inBracket * s.rate };
  });
}

export function buildDeductionLabel(payrollDeduction: number, currentContribs: number): string {
  const parts: string[] = [];
  if (payrollDeduction > 0) parts.push(`CPP ${currencyFormatter.format(payrollDeduction)}`);
  if (currentContribs > 1) parts.push(`RRSP/FHSA ${currencyFormatter.format(currentContribs)}`);
  return parts.length > 0 ? parts.join(' + ') : 'Deductions';
}

export function buildScenarioLabel(contributions: TaxPersonResult['contributions']): string {
  const parts: string[] = [];
  if (contributions.rrsp > 0) parts.push(`RRSP ${currencyFormatter.format(contributions.rrsp)}`);
  if (contributions.spousalRrsp > 0)
    parts.push(`Spousal RRSP ${currencyFormatter.format(contributions.spousalRrsp)}`);
  if (contributions.fhsa > 0) parts.push(`FHSA ${currencyFormatter.format(contributions.fhsa)}`);
  return parts.length > 0 ? parts.join(' + ') : 'Scenario contributions';
}
