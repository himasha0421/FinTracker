import { useEffect, useMemo, useState } from 'react';
import { useMutation, useQuery } from '@tanstack/react-query';
import {
  buildDefaultTaxPlanInput,
  buildEmptyScenarioOverrides,
  type BracketSlice,
  type TaxBucket,
  type TaxCreditBreakdown,
  type TaxOptimizationResult,
  type TaxPersonInput,
  type TaxPersonKey,
  type TaxPersonResult,
  type TaxPlanBundle,
  type TaxPlanInput,
  type TaxPlanScenarioInput,
  type TaxPlanningMode,
  type TaxScenarioOverrides,
  type MultiYearProjection,
  type SpousalAmountBreakEven,
  type TuitionTransferDetail,
} from '@shared/taxPlanning';
import { queryClient } from '@/lib/queryClient';
import { useToast } from '@/hooks/use-toast';
import { taxPlanKeys, taxPlansListQuery, createDefaultTaxPlan, updateTaxPlan, deleteTaxPlan, createTaxPlanScenario, updateTaxPlanScenario, deleteTaxPlanScenario } from './api';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Skeleton } from '@/components/ui/skeleton';
import { ChevronDown, ChevronUp, Loader2, Pencil, Plus, RefreshCw, Save, Trash2 } from 'lucide-react';

type PlanDraft = TaxPlanInput & { id: number };

const currencyFormatter = new Intl.NumberFormat('en-CA', {
  style: 'currency',
  currency: 'CAD',
  minimumFractionDigits: 0,
  maximumFractionDigits: 0,
});

const decimalFormatter = new Intl.NumberFormat('en-CA', {
  minimumFractionDigits: 0,
  maximumFractionDigits: 2,
});

function clonePlan(bundle: TaxPlanBundle): PlanDraft {
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

function toDateInput(value: string | null) {
  if (!value) return '';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '';
  return date.toISOString().split('T')[0];
}

function fromDateInput(value: string) {
  if (!value) return null;
  return new Date(`${value}T12:00:00.000Z`).toISOString();
}

function toNumber(value: string) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
}

function fieldLabelFromBucket(bucket: TaxBucket) {
  switch (bucket) {
    case 'fhsa':
      return 'FHSA';
    case 'rrsp':
      return 'RRSP';
    case 'spousalRrsp':
      return 'Spousal RRSP';
    case 'tfsa':
    default:
      return 'TFSA';
  }
}

function scenarioModeLabel(mode: TaxPlanningMode) {
  switch (mode) {
    case 'tax-max':
      return 'Tax Max';
    case 'home-max':
      return 'Home Max';
    default:
      return mode.charAt(0).toUpperCase() + mode.slice(1);
  }
}

function NumberField({
  id,
  label,
  value,
  onChange,
  step = '100',
  min = '0',
  max,
}: {
  id: string;
  label: string;
  value: number;
  onChange: (next: number) => void;
  step?: string;
  min?: string;
  max?: string;
}) {
  return (
    <div className="space-y-2">
      <Label htmlFor={id}>{label}</Label>
      <Input
        id={id}
        type="number"
        min={min}
        max={max}
        step={step}
        value={Number.isFinite(value) ? value : 0}
        onChange={event => onChange(toNumber(event.target.value))}
      />
    </div>
  );
}

function CheckboxField({
  id,
  label,
  checked,
  onChange,
}: {
  id: string;
  label: string;
  checked: boolean;
  onChange: (next: boolean) => void;
}) {
  return (
    <label htmlFor={id} className="flex items-center gap-3 rounded-md border px-3 py-2">
      <input
        id={id}
        type="checkbox"
        className="h-4 w-4"
        checked={checked}
        onChange={event => onChange(event.target.checked)}
      />
      <span className="text-sm">{label}</span>
    </label>
  );
}

// ─────────────────────────────────────────────
// Section 1: Family Net Tax KPI Card
// ─────────────────────────────────────────────
function FamilyNetTaxKpiCard({ summary }: { summary: TaxOptimizationResult['summary'] }) {
  const { familyNetTaxBefore, familyNetTaxAfter, familyNetTaxDelta, totalRefundableCredits } = summary;
  return (
    <div className="rounded-lg border-2 border-primary/30 bg-primary/5 px-5 py-4 space-y-3">
      <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Family Tax Summary</p>
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <div>
          <p className="text-xs text-muted-foreground">Family Net Tax Before</p>
          <p className="text-lg font-semibold">{currencyFormatter.format(familyNetTaxBefore)}</p>
        </div>
        <div>
          <p className="text-xs text-muted-foreground">Family Net Tax After (incl. refundable)</p>
          <p className="text-lg font-semibold">{currencyFormatter.format(familyNetTaxAfter)}</p>
        </div>
        <div>
          <p className="text-xs text-muted-foreground">Total Tax Saved</p>
          <p className={`text-lg font-semibold ${familyNetTaxDelta > 0 ? 'text-green-600 dark:text-green-400' : ''}`}>
            {currencyFormatter.format(familyNetTaxDelta)}
          </p>
        </div>
        {totalRefundableCredits > 0 && (
          <div>
            <p className="text-xs text-muted-foreground">MB Renters Credit</p>
            <p className="text-lg font-semibold text-blue-600 dark:text-blue-400">
              {currencyFormatter.format(totalRefundableCredits)}
            </p>
          </div>
        )}
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────
// Section: Bracket Visualization
// ─────────────────────────────────────────────

// Cool → warm spectrum, one entry per federal bracket (lowest → highest rate)
const BRACKET_COLOURS = [
  'bg-cyan-500 dark:bg-cyan-600',
  'bg-blue-500 dark:bg-blue-600',
  'bg-violet-500 dark:bg-violet-500',
  'bg-orange-500 dark:bg-orange-500',
  'bg-red-600 dark:bg-red-500',
];

// Extended spectrum for combined federal+provincial (up to 7 segments for MB)
const COMBINED_BRACKET_COLOURS = [
  'bg-emerald-500 dark:bg-emerald-600',
  'bg-teal-600 dark:bg-teal-500',
  'bg-blue-600 dark:bg-blue-500',
  'bg-indigo-600 dark:bg-indigo-500',
  'bg-violet-600 dark:bg-violet-500',
  'bg-orange-600 dark:bg-orange-500',
  'bg-red-600 dark:bg-red-500',
];

type CombinedSlice = BracketSlice & { fedRate: number; provRate: number };

function computeCombinedBreakdown(
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
    const fedRate = federalSlices.find(s => probe <= s.upTo)?.rate ?? federalSlices[federalSlices.length - 1].rate;
    const provRate = provincialSlices.find(s => probe <= s.upTo)?.rate ?? provincialSlices[provincialSlices.length - 1].rate;
    const combinedRate = fedRate + provRate;
    const inBracket = Math.max(0, Math.min(income, threshold) - prev);
    prev = threshold;
    return { upTo: threshold, rate: combinedRate, fedRate, provRate, incomeInBracket: inBracket, taxInBracket: inBracket * combinedRate };
  });
}

function computeBreakdownForIncome(income: number, slices: BracketSlice[]): BracketSlice[] {
  let prev = 0;
  return slices.map(s => {
    const top = Math.min(income, s.upTo);
    const inBracket = Math.max(0, top - prev);
    prev = s.upTo;
    return { upTo: s.upTo, rate: s.rate, incomeInBracket: inBracket, taxInBracket: inBracket * s.rate };
  });
}

function buildDeductionLabel(payrollDeduction: number, currentContribs: number): string {
  const parts: string[] = [];
  if (payrollDeduction > 0) parts.push(`CPP ${currencyFormatter.format(payrollDeduction)}`);
  if (currentContribs > 1) parts.push(`RRSP/FHSA ${currencyFormatter.format(currentContribs)}`);
  return parts.length > 0 ? parts.join(' + ') : 'Deductions';
}

function buildScenarioLabel(contributions: TaxPersonResult['contributions']): string {
  const parts: string[] = [];
  if (contributions.rrsp > 0) parts.push(`RRSP ${currencyFormatter.format(contributions.rrsp)}`);
  if (contributions.spousalRrsp > 0) parts.push(`Spousal RRSP ${currencyFormatter.format(contributions.spousalRrsp)}`);
  if (contributions.fhsa > 0) parts.push(`FHSA ${currencyFormatter.format(contributions.fhsa)}`);
  return parts.length > 0 ? parts.join(' + ') : 'Scenario contributions';
}

interface WaterfallStep {
  income: number;
  label: string;
  breakdown: BracketSlice[];
  deductionLabel?: string;
  deductionAmount?: number;
}

function DeductionWaterfallChart({
  personName,
  personResult,
}: {
  personName: string;
  personResult: TaxPersonResult;
}) {
  const [mode, setMode] = useState<'federal' | 'combined'>('combined');

  const {
    totalIncome,
    taxableIncomeBefore,
    taxableIncomeAfter,
    payroll,
    contributions,
    federalBracketBreakdownBefore,
    federalBracketBreakdownAfter,
    provincialBracketBreakdownBefore,
    provincialBracketBreakdownAfter,
  } = personResult;

  if (totalIncome <= 0) {
    return (
      <div className="rounded-lg border px-4 py-3">
        <p className="text-sm font-medium mb-3">Tax Brackets — {personName}</p>
        <div className="h-10 w-full rounded bg-muted flex items-center px-2">
          <span className="text-xs text-muted-foreground">No taxable income</span>
        </div>
      </div>
    );
  }

  const payrollDeduction = payroll.cppEnhanced + payroll.cpp2;
  const currentContribDeduction = Math.max(0, totalIncome - payrollDeduction - taxableIncomeBefore);
  const scenarioDeduction = Math.max(0, taxableIncomeBefore - taxableIncomeAfter);

  const isCombined = mode === 'combined';
  const colours = isCombined ? COMBINED_BRACKET_COLOURS : BRACKET_COLOURS;

  const grossBreakdown = isCombined
    ? computeCombinedBreakdown(totalIncome, federalBracketBreakdownBefore, provincialBracketBreakdownBefore)
    : computeBreakdownForIncome(totalIncome, federalBracketBreakdownBefore);

  const beforeBreakdown = isCombined
    ? computeCombinedBreakdown(taxableIncomeBefore, federalBracketBreakdownBefore, provincialBracketBreakdownBefore)
    : federalBracketBreakdownBefore;

  const afterBreakdown = isCombined
    ? computeCombinedBreakdown(taxableIncomeAfter, federalBracketBreakdownAfter, provincialBracketBreakdownAfter)
    : federalBracketBreakdownAfter;

  const steps: WaterfallStep[] = [
    { income: totalIncome, label: 'Gross income', breakdown: grossBreakdown },
    {
      income: taxableIncomeBefore,
      label: 'After current deductions',
      breakdown: beforeBreakdown,
      deductionLabel: buildDeductionLabel(payrollDeduction, currentContribDeduction),
      deductionAmount: payrollDeduction + currentContribDeduction,
    },
  ];

  if (scenarioDeduction > 1) {
    steps.push({
      income: taxableIncomeAfter,
      label: 'After scenario contributions',
      breakdown: afterBreakdown,
      deductionLabel: buildScenarioLabel(contributions),
      deductionAmount: scenarioDeduction,
    });
  }

  const activeSlices = grossBreakdown.filter(s => s.incomeInBracket > 0);

  // Bracket thresholds that fall within the gross income range — used for tick marks + x-axis
  const bracketThresholds = grossBreakdown
    .map(s => s.upTo)
    .filter(t => isFinite(t) && t < totalIncome);

  const fmtThreshold = (v: number) =>
    v >= 1000 ? `$${(v / 1000).toFixed(0)}K` : `$${v}`;

  return (
    <div className="rounded-lg border px-4 py-4 space-y-0.5">
      {/* Header with toggle */}
      <div className="flex items-center justify-between pb-2">
        <p className="text-sm font-medium">
          {isCombined ? 'Federal + Provincial Tax Brackets' : 'Federal Tax Brackets'} — {personName}
        </p>
        <div className="flex rounded-md border text-[11px] overflow-hidden shrink-0">
          <button
            className={`px-2.5 py-1 transition-colors ${mode === 'combined' ? 'bg-foreground text-background font-medium' : 'text-muted-foreground hover:text-foreground'}`}
            onClick={() => setMode('combined')}
          >
            Combined
          </button>
          <button
            className={`px-2.5 py-1 transition-colors border-l ${mode === 'federal' ? 'bg-foreground text-background font-medium' : 'text-muted-foreground hover:text-foreground'}`}
            onClick={() => setMode('federal')}
          >
            Federal
          </button>
        </div>
      </div>

      {steps.map((step, idx) => (
        <div key={idx}>
          {/* Connector row */}
          {step.deductionLabel && !!step.deductionAmount && step.deductionAmount > 0 && (
            <div className="flex items-center gap-1.5 py-1 text-[11px] pl-1">
              <span className="text-red-500 font-bold">↓</span>
              <span className="font-medium text-red-500/90">−{currencyFormatter.format(step.deductionAmount)}</span>
              <span className="text-muted-foreground/50">·</span>
              <span className="text-muted-foreground">{step.deductionLabel}</span>
            </div>
          )}

          {/* Bar row */}
          <div className="flex items-center gap-2">
            <div className="relative h-9 flex-1 rounded overflow-hidden flex">
              {step.breakdown.filter(s => s.incomeInBracket > 0).map((slice, i) => {
                const w = (slice.incomeInBracket / totalIncome) * 100;
                const isCombinedSlice = isCombined && 'fedRate' in slice;
                const tooltip = isCombinedSlice
                  ? `${((slice as CombinedSlice).fedRate * 100).toFixed(1)}% fed + ${((slice as CombinedSlice).provRate * 100).toFixed(1)}% prov = ${(slice.rate * 100).toFixed(2)}% combined — ${currencyFormatter.format(slice.incomeInBracket)}`
                  : `${(slice.rate * 100).toFixed(1)}% bracket: ${currencyFormatter.format(slice.incomeInBracket)}`;
                return (
                  <div
                    key={i}
                    className={`${colours[i % colours.length]} flex items-center justify-center shrink-0`}
                    style={{ width: `${w}%` }}
                    title={tooltip}
                  >
                    {w > 8 && (
                      <span className="text-[10px] font-semibold text-white drop-shadow select-none">
                        {(slice.rate * 100).toFixed(1)}%
                      </span>
                    )}
                  </div>
                );
              })}
              {/* Deducted area */}
              <div
                className="flex-1 bg-muted/40"
                style={{
                  backgroundImage:
                    idx > 0
                      ? 'repeating-linear-gradient(-45deg, transparent, transparent 4px, rgba(0,0,0,0.05) 4px, rgba(0,0,0,0.05) 8px)'
                      : 'none',
                }}
              />
              {/* Bracket boundary tick marks */}
              {bracketThresholds.map(threshold => (
                <div
                  key={threshold}
                  className="absolute inset-y-0 w-px bg-white/50 z-10 pointer-events-none"
                  style={{ left: `${(threshold / totalIncome) * 100}%` }}
                />
              ))}
            </div>
            <span className="w-20 shrink-0 text-right text-xs tabular-nums font-medium text-foreground/80">
              {currencyFormatter.format(step.income)}
            </span>
          </div>
        </div>
      ))}

      {/* Shared x-axis with bracket threshold labels */}
      {bracketThresholds.length > 0 && (
        <div className="flex items-start gap-2 pt-0.5">
          <div className="relative flex-1 h-4 select-none">
            <span className="absolute left-0 text-[10px] text-muted-foreground/60">$0</span>
            {bracketThresholds.map(threshold => {
              const pct = (threshold / totalIncome) * 100;
              return (
                <span
                  key={threshold}
                  className="absolute -translate-x-1/2 text-[10px] text-muted-foreground font-medium"
                  style={{ left: `${pct}%` }}
                >
                  {fmtThreshold(threshold)}
                </span>
              );
            })}
          </div>
          <span className="w-20 shrink-0" />
        </div>
      )}

      {/* Legend */}
      <div className="flex flex-wrap gap-x-4 gap-y-1 pt-3">
        {activeSlices.map((slice, i) => {
          const label = isCombined && 'fedRate' in slice
            ? `${((slice as CombinedSlice).fedRate * 100).toFixed(1)}+${((slice as CombinedSlice).provRate * 100).toFixed(1)}% = ${(slice.rate * 100).toFixed(2)}%`
            : `${(slice.rate * 100).toFixed(1)}%`;
          return (
            <div key={i} className="flex items-center gap-1.5">
              <span className={`inline-block h-2.5 w-2.5 rounded-sm ${colours[i % colours.length]}`} />
              <span className="text-xs text-muted-foreground">{label}</span>
            </div>
          );
        })}
        <div className="flex items-center gap-1.5">
          <span className="inline-block h-2.5 w-2.5 rounded-sm bg-muted/60 border border-dashed border-muted-foreground/30" />
          <span className="text-xs text-muted-foreground">Deducted from income</span>
        </div>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────
// Section: Bracket Threshold Insight Card
// ─────────────────────────────────────────────
function BracketThresholdInsightCard({
  people,
}: {
  people: Record<TaxPersonKey, TaxPersonResult>;
}) {
  const entries = (['personA', 'personB'] as TaxPersonKey[])
    .map(key => ({ key, person: people[key] }))
    .filter(({ person }) => person.bracketThresholdInsight != null);

  if (entries.length === 0) return null;

  return (
    <div className="rounded-lg border-2 border-amber-400/60 bg-amber-50/40 dark:bg-amber-950/20 px-5 py-4 space-y-3">
      <p className="text-sm font-semibold text-amber-800 dark:text-amber-300">
        Federal Bracket Threshold Insights
      </p>
      {entries.map(({ person }) => {
        const insight = person.bracketThresholdInsight!;
        if (insight.additionalDeductionNeeded === 0) {
          return (
            <div key={person.name} className="text-sm text-muted-foreground">
              <span className="text-green-600 dark:text-green-400 font-medium">✓ {person.name}:</span>{' '}
              Already in the lowest applicable federal bracket.
            </div>
          );
        }
        return (
          <div key={person.name} className="space-y-1">
            <p className="text-sm">
              <span className="font-medium">📍 {person.name}:</span> Add{' '}
              <span className="font-semibold text-amber-700 dark:text-amber-300">
                {currencyFormatter.format(insight.additionalDeductionNeeded)}
              </span>{' '}
              more in RRSP/FHSA deductions to drop below the{' '}
              <span className="font-semibold">
                {(insight.federalCurrentRate * 100).toFixed(1)}%
              </span>{' '}
              federal bracket
            </p>
            <p className="text-sm text-green-700 dark:text-green-400">
              → Saves an extra{' '}
              <span className="font-semibold">
                {currencyFormatter.format(insight.taxSavingIfThresholdHit)}
              </span>{' '}
              (at {(insight.federalCurrentRate * 100).toFixed(1)}% vs{' '}
              {(insight.federalLowerRate * 100).toFixed(1)}%)
            </p>
            <p className="text-xs text-muted-foreground">
              Currently:{' '}
              <span className="font-medium text-foreground">
                {(insight.combinedCurrentMarginalRate * 100).toFixed(2)}%
              </span>{' '}
              combined marginal rate → would drop to{' '}
              <span className="font-medium text-foreground">
                {(insight.combinedLowerMarginalRate * 100).toFixed(2)}%
              </span>
            </p>
          </div>
        );
      })}
    </div>
  );
}

// ─────────────────────────────────────────────
// Section 2: Credits Breakdown Table (per-person, collapsible)
// ─────────────────────────────────────────────
function CreditsBreakdownTable({
  personName,
  federalCredits,
  provincialCredits,
  payroll,
}: {
  personName: string;
  federalCredits: TaxCreditBreakdown;
  provincialCredits: TaxCreditBreakdown;
  payroll: TaxOptimizationResult['people'][TaxPersonKey]['payroll'];
}) {
  const [open, setOpen] = useState(false);

  const creditRows: Array<{ label: string; fedAmount: number; fedValue: number; mbAmount: number; mbValue: number }> = [
    {
      label: 'Basic Personal Amount',
      fedAmount: federalCredits.basicPersonalAmount,
      fedValue: federalCredits.basicPersonalAmount * 0.15,
      mbAmount: provincialCredits.basicPersonalAmount,
      mbValue: provincialCredits.basicPersonalAmount * 0.108,
    },
    {
      label: 'Spousal Amount',
      fedAmount: federalCredits.spousalAmount,
      fedValue: federalCredits.spousalAmount * 0.15,
      mbAmount: provincialCredits.spousalAmount,
      mbValue: provincialCredits.spousalAmount * 0.108,
    },
    {
      label: 'Canada Employment Amount',
      fedAmount: federalCredits.canadaEmploymentAmount,
      fedValue: federalCredits.canadaEmploymentAmount * 0.15,
      mbAmount: provincialCredits.canadaEmploymentAmount,
      mbValue: provincialCredits.canadaEmploymentAmount * 0.108,
    },
    {
      label: 'CPP/EI Credit',
      fedAmount: federalCredits.cppEiCredit,
      fedValue: federalCredits.cppEiCredit * 0.15,
      mbAmount: provincialCredits.cppEiCredit,
      mbValue: provincialCredits.cppEiCredit * 0.108,
    },
    {
      label: 'Tuition (own)',
      fedAmount: federalCredits.tuitionOwn,
      fedValue: federalCredits.tuitionOwn * 0.15,
      mbAmount: provincialCredits.tuitionOwn,
      mbValue: provincialCredits.tuitionOwn * 0.108,
    },
    {
      label: 'Tuition Transfer Received',
      fedAmount: federalCredits.tuitionTransferIn,
      fedValue: federalCredits.tuitionTransferIn * 0.15,
      mbAmount: provincialCredits.tuitionTransferIn,
      mbValue: provincialCredits.tuitionTransferIn * 0.108,
    },
  ];

  return (
    <div className="rounded-lg border px-4 py-3">
      <button
        type="button"
        className="flex w-full items-center justify-between text-sm font-medium"
        onClick={() => setOpen(prev => !prev)}
      >
        <span>Tax Credits Detail — {personName}</span>
        <span className="text-muted-foreground">{open ? '▲' : '▼'}</span>
      </button>

      {open && (
        <div className="mt-4 space-y-4 overflow-x-auto">
          <table className="w-full text-xs">
            <thead>
              <tr className="border-b text-left text-muted-foreground">
                <th className="pb-2 pr-4 font-medium">Credit</th>
                <th className="pb-2 pr-4 font-medium text-right">Federal Amount</th>
                <th className="pb-2 pr-4 font-medium text-right">Federal Value</th>
                <th className="pb-2 pr-4 font-medium text-right">MB Amount</th>
                <th className="pb-2 font-medium text-right">MB Value</th>
              </tr>
            </thead>
            <tbody>
              {creditRows.map(row => (
                <tr key={row.label} className="border-b border-border/40">
                  <td className="py-1.5 pr-4">{row.label}</td>
                  <td className="py-1.5 pr-4 text-right">{currencyFormatter.format(row.fedAmount)}</td>
                  <td className="py-1.5 pr-4 text-right">{currencyFormatter.format(row.fedValue)}</td>
                  <td className="py-1.5 pr-4 text-right">{currencyFormatter.format(row.mbAmount)}</td>
                  <td className="py-1.5 text-right">{currencyFormatter.format(row.mbValue)}</td>
                </tr>
              ))}
              <tr className="font-semibold">
                <td className="py-1.5 pr-4">Total Non-Refundable Credits</td>
                <td className="py-1.5 pr-4 text-right">{currencyFormatter.format(federalCredits.totalCreditAmount)}</td>
                <td className="py-1.5 pr-4 text-right">{currencyFormatter.format(federalCredits.totalCreditValue)}</td>
                <td className="py-1.5 pr-4 text-right">{currencyFormatter.format(provincialCredits.totalCreditAmount)}</td>
                <td className="py-1.5 text-right">{currencyFormatter.format(provincialCredits.totalCreditValue)}</td>
              </tr>
            </tbody>
          </table>

          <div>
            <p className="mb-1 text-xs font-medium text-muted-foreground uppercase tracking-wide">Payroll Deductions</p>
            <table className="w-full text-xs">
              <thead>
                <tr className="border-b text-left text-muted-foreground">
                  <th className="pb-1.5 pr-4 font-medium">CPP Base</th>
                  <th className="pb-1.5 pr-4 font-medium">CPP Enhanced</th>
                  <th className="pb-1.5 pr-4 font-medium">CPP2</th>
                  <th className="pb-1.5 pr-4 font-medium">EI</th>
                  <th className="pb-1.5 font-medium">Total Deduction</th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td className="py-1.5 pr-4">{currencyFormatter.format(payroll.cppBase)}</td>
                  <td className="py-1.5 pr-4">{currencyFormatter.format(payroll.cppEnhanced)}</td>
                  <td className="py-1.5 pr-4">{currencyFormatter.format(payroll.cpp2)}</td>
                  <td className="py-1.5 pr-4">{currencyFormatter.format(payroll.ei)}</td>
                  <td className="py-1.5 font-semibold">{currencyFormatter.format(payroll.totalDeduction)}</td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}

// ─────────────────────────────────────────────
// Section 3: Tuition Transfer Recommendation Card
// ─────────────────────────────────────────────
function TuitionTransferRecommendationCard({
  tuitionTransfer,
  personAName,
  personBName,
}: {
  tuitionTransfer: TuitionTransferDetail;
  personAName: string;
  personBName: string;
}) {
  const donorName = tuitionTransfer.donor === 'personA' ? personAName : personBName;
  const recipientName = tuitionTransfer.recipient === 'personA' ? personAName : personBName;

  return (
    <div className="rounded-lg border-2 border-blue-400/50 bg-blue-50/30 dark:bg-blue-950/20 px-5 py-4 space-y-2">
      <p className="text-sm font-semibold text-blue-700 dark:text-blue-300">Tuition Transfer Opportunity</p>
      <p className="text-sm">
        Transfer{' '}
        <span className="font-medium">{currencyFormatter.format(tuitionTransfer.recommendedFederalAmount)}</span>{' '}
        of <span className="font-medium">{donorName}</span>'s current-year tuition to{' '}
        <span className="font-medium">{recipientName}</span>.
      </p>
      <p className="text-sm text-green-700 dark:text-green-400">
        Estimated family tax saving:{' '}
        <span className="font-semibold">{currencyFormatter.format(tuitionTransfer.taxSaved)}</span>
      </p>
      <div className="grid gap-1 text-sm text-muted-foreground sm:grid-cols-2">
        <p>Federal transferred: {currencyFormatter.format(tuitionTransfer.recommendedFederalAmount)}</p>
        <p>Provincial transferred: {currencyFormatter.format(tuitionTransfer.recommendedProvincialAmount)}</p>
        <p>{donorName} carries forward (federal): {currencyFormatter.format(tuitionTransfer.carryForwardFederal)}</p>
        <p>{donorName} carries forward (MB): {currencyFormatter.format(tuitionTransfer.carryForwardProvincial)}</p>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────
// Section 4: Spousal Amount Break-Even Card
// ─────────────────────────────────────────────
function SpousalAmountBreakEvenCard({
  spousalBreakEven,
  personBName,
}: {
  spousalBreakEven: SpousalAmountBreakEven;
  personBName: string;
}) {
  const { federalBreakEven, currentSpouseNetIncome, marginalCostPer1k } = spousalBreakEven;
  const phasedOut = currentSpouseNetIncome >= federalBreakEven;
  const progressPct = phasedOut
    ? 100
    : Math.min(100, (currentSpouseNetIncome / federalBreakEven) * 100);

  return (
    <div className="rounded-lg border px-5 py-4 space-y-3">
      <p className="text-sm font-semibold">Spousal Amount Break-Even</p>
      <div className="space-y-1">
        <div className="flex justify-between text-xs text-muted-foreground">
          <span>$0</span>
          <span>{currencyFormatter.format(federalBreakEven)} (break-even)</span>
        </div>
        <div className="relative h-3 w-full rounded-full bg-muted overflow-hidden">
          <div
            className={`h-full rounded-full transition-all ${phasedOut ? 'bg-destructive' : 'bg-primary'}`}
            style={{ width: `${progressPct}%` }}
          />
          {!phasedOut && (
            <div
              className="absolute top-0 h-full w-0.5 bg-foreground/60"
              style={{ left: `${progressPct}%` }}
            />
          )}
        </div>
        <p className="text-xs text-muted-foreground">
          {personBName} current net income:{' '}
          <span className="font-medium text-foreground">{currencyFormatter.format(currentSpouseNetIncome)}</span>
        </p>
      </div>
      {phasedOut ? (
        <p className="text-sm text-muted-foreground">
          Spousal amount fully phased out — each spouse now claims their own BPA independently.
        </p>
      ) : (
        <p className="text-sm text-muted-foreground">
          Each $1,000 of{' '}
          <span className="font-medium text-foreground">{personBName}</span>'s income below{' '}
          {currencyFormatter.format(federalBreakEven)} saves the family ~
          <span className="font-medium text-foreground">{currencyFormatter.format(marginalCostPer1k)}</span>
        </p>
      )}
    </div>
  );
}

// ─────────────────────────────────────────────
// Section 5: Multi-Year Timeline
// ─────────────────────────────────────────────
function MultiYearTimeline({ multiYear }: { multiYear: MultiYearProjection }) {
  const { byYear, projectedHomeFundsAtPurchase, shortfallAtPurchase } = multiYear;

  return (
    <div className="space-y-3">
      <p className="text-sm font-semibold">3-Year Projection</p>
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b text-left text-muted-foreground">
              <th className="pb-2 pr-4 font-medium">Tax Year</th>
              <th className="pb-2 pr-4 font-medium text-right">Family Net Tax After</th>
              <th className="pb-2 pr-4 font-medium text-right">FHSA Balance (combined)</th>
              <th className="pb-2 pr-4 font-medium text-right">RRSP Room Remaining (combined)</th>
              <th className="pb-2 font-medium text-right">Projected Home Funds</th>
            </tr>
          </thead>
          <tbody>
            {byYear.map(yearRow => {
              const combinedFhsa =
                yearRow.fhsaBalanceEndOfYear.personA + yearRow.fhsaBalanceEndOfYear.personB;
              const combinedRrspRoom =
                yearRow.rrspRoomEndOfYear.personA + yearRow.rrspRoomEndOfYear.personB;
              const homeFunds = yearRow.result.summary.totalProjectedHomeFunds;

              return (
                <tr key={yearRow.taxYear} className="border-b border-border/40">
                  <td className="py-2 pr-4 font-medium">
                    {yearRow.taxYear}
                    {yearRow.projected && (
                      <span className="ml-1 text-xs text-muted-foreground">(est.)</span>
                    )}
                  </td>
                  <td className="py-2 pr-4 text-right">
                    {currencyFormatter.format(yearRow.result.summary.familyNetTaxAfter)}
                  </td>
                  <td className="py-2 pr-4 text-right">{currencyFormatter.format(combinedFhsa)}</td>
                  <td className="py-2 pr-4 text-right">{currencyFormatter.format(combinedRrspRoom)}</td>
                  <td className="py-2 text-right">{currencyFormatter.format(homeFunds)}</td>
                </tr>
              );
            })}
          </tbody>
          <tfoot>
            <tr className="font-semibold">
              <td className="pt-3 pr-4" colSpan={4}>
                Projected home funds at purchase
              </td>
              <td className="pt-3 text-right">{currencyFormatter.format(projectedHomeFundsAtPurchase)}</td>
            </tr>
            {shortfallAtPurchase > 0 && (
              <tr className="text-destructive">
                <td className="pt-1 pr-4" colSpan={4}>
                  Shortfall at purchase
                </td>
                <td className="pt-1 text-right">{currencyFormatter.format(shortfallAtPurchase)}</td>
              </tr>
            )}
          </tfoot>
        </table>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────
// Section 6: PersonSection with new fields
// ─────────────────────────────────────────────
function PersonSection({
  personKey,
  person,
  onChange,
}: {
  personKey: TaxPersonKey;
  person: TaxPersonInput;
  onChange: (next: TaxPersonInput) => void;
}) {
  const fallbackTitle = personKey === 'personA' ? 'Partner A' : 'Partner B';
  const [collapsed, setCollapsed] = useState(false);
  const [detailsOpen, setDetailsOpen] = useState(false);
  const [editingName, setEditingName] = useState(false);

  return (
    <Card className="border-border/60">
      <CardHeader>
        <div className="flex items-start justify-between gap-2">
          <div className="flex-1 min-w-0">
            {editingName ? (
              <input
                autoFocus
                className="text-lg font-semibold bg-transparent border-b border-primary outline-none w-full leading-tight"
                value={person.name}
                onChange={e => onChange({ ...person, name: e.target.value })}
                onBlur={() => setEditingName(false)}
                onKeyDown={e => (e.key === 'Enter' || e.key === 'Escape') && setEditingName(false)}
              />
            ) : (
              <button
                type="button"
                className="flex items-center gap-1.5 group text-left"
                onClick={() => setEditingName(true)}
                title="Click to rename"
              >
                <span className="text-lg font-semibold leading-tight">
                  {person.name?.trim() || fallbackTitle}
                </span>
                <Pencil className="h-3 w-3 text-muted-foreground opacity-0 group-hover:opacity-60 transition-opacity shrink-0" />
              </button>
            )}
            {!collapsed && (
              <p className="text-sm text-muted-foreground mt-1">Income, room, balances, and home-buyer eligibility.</p>
            )}
          </div>
          <button
            type="button"
            className="text-muted-foreground hover:text-foreground transition-colors p-1 -mt-1 -mr-1 rounded"
            onClick={() => setCollapsed(prev => !prev)}
            title={collapsed ? 'Expand' : 'Collapse'}
          >
            {collapsed ? <ChevronDown className="h-4 w-4" /> : <ChevronUp className="h-4 w-4" />}
          </button>
        </div>
      </CardHeader>
      {!collapsed && (
      <CardContent className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        <NumberField
          id={`${personKey}-employment-income`}
          label="Employment income"
          value={person.employmentIncome}
          onChange={value => onChange({ ...person, employmentIncome: value })}
        />
        <NumberField
          id={`${personKey}-other-income`}
          label="Other taxable income"
          value={person.otherTaxableIncome}
          onChange={value => onChange({ ...person, otherTaxableIncome: value })}
        />
        <NumberField
          id={`${personKey}-rrsp-room`}
          label="RRSP deduction limit"
          value={person.rrspDeductionLimit}
          onChange={value => onChange({ ...person, rrspDeductionLimit: value })}
        />
        <div className="space-y-2">
          <Label htmlFor={`${personKey}-fhsa-room`}>FHSA contribution room (start of year)</Label>
          <Input
            id={`${personKey}-fhsa-room`}
            type="number"
            min="0"
            step="100"
            value={Number.isFinite(person.fhsaRoom) ? person.fhsaRoom : 0}
            onChange={event => onChange({ ...person, fhsaRoom: toNumber(event.target.value) })}
          />
          <p className="text-xs text-muted-foreground mt-0.5">Remaining room is auto-calculated from contributions</p>
        </div>
        <div className="space-y-2">
          <Label htmlFor={`${personKey}-tfsa-room`}>TFSA contribution room (start of year)</Label>
          <Input
            id={`${personKey}-tfsa-room`}
            type="number"
            min="0"
            step="100"
            value={Number.isFinite(person.tfsaRoom) ? person.tfsaRoom : 0}
            onChange={event => onChange({ ...person, tfsaRoom: toNumber(event.target.value) })}
          />
          <p className="text-xs text-muted-foreground mt-0.5">Remaining room is auto-calculated from contributions</p>
        </div>
        <NumberField
          id={`${personKey}-rrsp-ytd`}
          label="RRSP contributed in 2026 (YTD)"
          value={person.currentYearRrspContributions}
          onChange={value => onChange({ ...person, currentYearRrspContributions: value })}
        />
        <NumberField
          id={`${personKey}-fhsa-ytd`}
          label="FHSA contributed in 2026 (YTD)"
          value={person.currentYearFhsaContributions}
          onChange={value => onChange({ ...person, currentYearFhsaContributions: value })}
        />
        <NumberField
          id={`${personKey}-tfsa-ytd`}
          label="TFSA contributed in 2026 (YTD)"
          value={person.currentYearTfsaContributions}
          onChange={value => onChange({ ...person, currentYearTfsaContributions: value })}
        />
        <NumberField
          id={`${personKey}-match-cap`}
          label="Employer RRSP match cap"
          value={person.employerRrspMatchCap}
          onChange={value => onChange({ ...person, employerRrspMatchCap: value })}
        />
        <NumberField
          id={`${personKey}-match-rate`}
          label="Employer RRSP match rate"
          value={person.employerRrspMatchRate}
          onChange={value => onChange({ ...person, employerRrspMatchRate: value })}
          step="0.05"
        />
        <NumberField
          id={`${personKey}-hbp-balance`}
          label="Outstanding HBP balance"
          value={person.currentHbpBalance}
          onChange={value => onChange({ ...person, currentHbpBalance: value })}
        />
        <NumberField
          id={`${personKey}-personal-rrsp-balance`}
          label="Current personal RRSP balance"
          value={person.currentPersonalRrspBalance}
          onChange={value => onChange({ ...person, currentPersonalRrspBalance: value })}
        />
        <NumberField
          id={`${personKey}-spousal-rrsp-balance`}
          label="Current spousal RRSP balance"
          value={person.currentSpousalRrspBalance}
          onChange={value => onChange({ ...person, currentSpousalRrspBalance: value })}
        />
        <div className="space-y-2">
          <Label htmlFor={`${personKey}-fhsa-balance`}>FHSA account balance (investment value)</Label>
          <Input
            id={`${personKey}-fhsa-balance`}
            type="number"
            min="0"
            step="100"
            value={Number.isFinite(person.currentFhsaBalance) ? person.currentFhsaBalance : 0}
            onChange={event => onChange({ ...person, currentFhsaBalance: toNumber(event.target.value) })}
          />
          <p className="text-xs text-muted-foreground mt-0.5">Total $ currently invested in your FHSA (not contribution room)</p>
        </div>
        <div className="space-y-2">
          <Label htmlFor={`${personKey}-tfsa-balance`}>TFSA account balance (investment value)</Label>
          <Input
            id={`${personKey}-tfsa-balance`}
            type="number"
            min="0"
            step="100"
            value={Number.isFinite(person.currentTfsaBalance) ? person.currentTfsaBalance : 0}
            onChange={event => onChange({ ...person, currentTfsaBalance: toNumber(event.target.value) })}
          />
          <p className="text-xs text-muted-foreground mt-0.5">Total $ currently in your TFSA account(s)</p>
        </div>
        <NumberField
          id={`${personKey}-recent-hbp`}
          label="RRSP contributions made in last 89 days"
          value={person.recentHbpRrspContributions}
          onChange={value => onChange({ ...person, recentHbpRrspContributions: value })}
        />
        <div className="md:col-span-2 xl:col-span-3">
          <CheckboxField
            id={`${personKey}-home-buyer`}
            label="Eligible as a first-time home buyer"
            checked={person.firstTimeHomeBuyerEligible}
            onChange={value => onChange({ ...person, firstTimeHomeBuyerEligible: value })}
          />
        </div>

        {/* Income & Tuition Details sub-section */}
        <div className="md:col-span-2 xl:col-span-3 rounded-lg border px-4 py-3 space-y-4">
          <button
            type="button"
            className="flex w-full items-center justify-between text-sm font-medium"
            onClick={() => setDetailsOpen(prev => !prev)}
          >
            <span>Income &amp; Tuition Details</span>
            <span className="text-muted-foreground">{detailsOpen ? '▲' : '▼'}</span>
          </button>

          {detailsOpen && (
            <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
              <NumberField
                id={`${personKey}-months-employed`}
                label="Months employed in 2026"
                value={person.monthsEmployedThisYear}
                onChange={value => onChange({ ...person, monthsEmployedThisYear: Math.min(12, Math.max(0, Math.round(value))) })}
                step="1"
                min="0"
                max="12"
              />
              {person.monthsEmployedThisYear < 12 && (
                <NumberField
                  id={`${personKey}-employment-start-month`}
                  label="Start month (1=Jan, 4=Apr…)"
                  value={person.employmentStartMonth ?? 1}
                  onChange={value =>
                    onChange({ ...person, employmentStartMonth: Math.min(12, Math.max(1, Math.round(value))) })
                  }
                  step="1"
                  min="1"
                  max="12"
                />
              )}
              <div className="space-y-2">
                <Label htmlFor={`${personKey}-monthly-salary`}>
                  Monthly salary (for future-year projection){' '}
                  <span className="text-muted-foreground text-xs">(optional)</span>
                </Label>
                <Input
                  id={`${personKey}-monthly-salary`}
                  type="number"
                  min="0"
                  step="100"
                  placeholder="e.g. 4500"
                  value={person.monthlySalary ?? ''}
                  onChange={event => {
                    const raw = event.target.value;
                    onChange({ ...person, monthlySalary: raw === '' ? null : toNumber(raw) });
                  }}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor={`${personKey}-tuition-paid`}>Current year tuition paid (T2202)</Label>
                <Input
                  id={`${personKey}-tuition-paid`}
                  type="number"
                  min="0"
                  step="100"
                  value={Number.isFinite(person.currentYearTuitionPaid) ? person.currentYearTuitionPaid : 0}
                  onChange={event => onChange({ ...person, currentYearTuitionPaid: toNumber(event.target.value) })}
                />
                <p className="text-xs text-muted-foreground mt-0.5">2026 Jan–Mar tuition only (if studies completed). Unused amount (after reducing own tax) can be transferred to spouse this year</p>
              </div>
              <div className="space-y-2">
                <Label htmlFor={`${personKey}-tuition-carryforward-federal`}>Federal tuition carryforward from prior years</Label>
                <Input
                  id={`${personKey}-tuition-carryforward-federal`}
                  type="number"
                  min="0"
                  step="100"
                  value={Number.isFinite(person.tuitionCarryforwardFederal) ? person.tuitionCarryforwardFederal : 0}
                  onChange={event => onChange({ ...person, tuitionCarryforwardFederal: toNumber(event.target.value) })}
                />
                <p className="text-xs text-muted-foreground mt-0.5">Carryforward can only be used by this person in future years — it cannot be transferred to a spouse</p>
              </div>
              <div className="space-y-2">
                <Label htmlFor={`${personKey}-tuition-carryforward-provincial`}>MB tuition carryforward from prior years</Label>
                <Input
                  id={`${personKey}-tuition-carryforward-provincial`}
                  type="number"
                  min="0"
                  step="100"
                  value={Number.isFinite(person.tuitionCarryforwardProvincial) ? person.tuitionCarryforwardProvincial : 0}
                  onChange={event => onChange({ ...person, tuitionCarryforwardProvincial: toNumber(event.target.value) })}
                />
                <p className="text-xs text-muted-foreground mt-0.5">Carryforward can only be used by this person in future years — it cannot be transferred to a spouse</p>
              </div>
              <NumberField
                id={`${personKey}-spousal-rrsp-3yr`}
                label="Spousal RRSP contributed in last 3 years"
                value={person.spousalRrspContributionsLastThreeYears}
                onChange={value =>
                  onChange({ ...person, spousalRrspContributionsLastThreeYears: value })
                }
              />
            </div>
          )}
        </div>
      </CardContent>
      )}
    </Card>
  );
}

function ManualScenarioEditor({
  scenario,
  planId,
  onSave,
}: {
  scenario: TaxPlanBundle['scenarios'][number];
  planId: number;
  onSave: (payload: TaxPlanScenarioInput) => void;
}) {
  const [local, setLocal] = useState<TaxScenarioOverrides>(
    scenario.overrides ?? buildEmptyScenarioOverrides()
  );

  useEffect(() => {
    setLocal(scenario.overrides ?? buildEmptyScenarioOverrides());
  }, [scenario.id, scenario.overrides]);

  const updatePersonBucket = (personKey: TaxPersonKey, bucket: TaxBucket, value: number) => {
    setLocal(current => ({
      ...current,
      [personKey]: {
        ...current[personKey],
        [bucket]: value,
      },
    }));
  };

  return (
    <Card className="border-border/60">
      <CardHeader>
        <CardTitle>Manual Overrides</CardTitle>
        <CardDescription>Persist an exact contribution split for comparison.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {(['personA', 'personB'] as TaxPersonKey[]).map(personKey => (
          <div key={personKey} className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
            {(['fhsa', 'rrsp', 'spousalRrsp', 'tfsa'] as TaxBucket[]).map(bucket => (
              <NumberField
                key={`${scenario.id}-${personKey}-${bucket}`}
                id={`${scenario.id}-${personKey}-${bucket}`}
                label={`${personKey === 'personA' ? 'Partner A' : 'Partner B'} ${fieldLabelFromBucket(bucket)}`}
                value={local[personKey][bucket]}
                onChange={value => updatePersonBucket(personKey, bucket, value)}
              />
            ))}
          </div>
        ))}
        <div className="flex justify-end">
          <Button
            variant="secondary"
            onClick={() =>
              onSave({
                name: scenario.name,
                mode: 'manual',
                overrides: local,
              })
            }
          >
            Save Manual Scenario
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

export default function TaxPlanningScreen() {
  const { toast } = useToast();
  const { data: bundles = [], isLoading } = useQuery(taxPlansListQuery());
  const [selectedPlanId, setSelectedPlanId] = useState<number | null>(null);
  const [draft, setDraft] = useState<PlanDraft | null>(null);

  useEffect(() => {
    if (!bundles.length) {
      setSelectedPlanId(null);
      setDraft(null);
      return;
    }

    const activePlan =
      bundles.find(bundle => bundle.plan.id === selectedPlanId) ?? bundles[0];
    if (activePlan.plan.id !== selectedPlanId) {
      setSelectedPlanId(activePlan.plan.id);
    }
    setDraft(clonePlan(activePlan));
  }, [bundles, selectedPlanId]);

  const selectedBundle = useMemo(
    () => bundles.find(bundle => bundle.plan.id === selectedPlanId) ?? null,
    [bundles, selectedPlanId]
  );

  const recommendedScenario =
    selectedBundle?.scenarios.find(scenario => scenario.mode === 'recommended') ??
    selectedBundle?.scenarios.find(scenario => scenario.mode === 'balanced') ??
    selectedBundle?.scenarios[0] ??
    null;

  const createDefaultMutation = useMutation({
    mutationFn: () => createDefaultTaxPlan(),
    onSuccess: async bundle => {
      await queryClient.invalidateQueries({ queryKey: taxPlanKeys.all });
      setSelectedPlanId(bundle.plan.id);
      toast({ title: 'Tax plan created', description: 'A default household plan is ready to edit.' });
    },
  });

  const savePlanMutation = useMutation({
    mutationFn: ({ id, data }: { id: number; data: TaxPlanInput }) => updateTaxPlan(id, data),
    onSuccess: async bundle => {
      await queryClient.invalidateQueries({ queryKey: taxPlanKeys.all });
      setSelectedPlanId(bundle.plan.id);
      toast({ title: 'Plan saved', description: 'Household inputs and scenario results were refreshed.' });
    },
  });

  const deletePlanMutation = useMutation({
    mutationFn: (id: number) => deleteTaxPlan(id),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: taxPlanKeys.all });
      toast({ title: 'Plan deleted', description: 'The household tax plan was removed.' });
    },
  });

  const createScenarioMutation = useMutation({
    mutationFn: ({ planId, data }: { planId: number; data: TaxPlanScenarioInput }) =>
      createTaxPlanScenario(planId, data),
    onSuccess: async bundle => {
      await queryClient.invalidateQueries({ queryKey: taxPlanKeys.all });
      setSelectedPlanId(bundle.plan.id);
      toast({ title: 'Scenario added', description: 'The scenario has been saved and recalculated.' });
    },
  });

  const updateScenarioMutation = useMutation({
    mutationFn: ({
      planId,
      scenarioId,
      data,
    }: {
      planId: number;
      scenarioId: number;
      data: TaxPlanScenarioInput;
    }) => updateTaxPlanScenario(planId, scenarioId, data),
    onSuccess: async bundle => {
      await queryClient.invalidateQueries({ queryKey: taxPlanKeys.all });
      setSelectedPlanId(bundle.plan.id);
      toast({ title: 'Scenario updated', description: 'The scenario results were refreshed.' });
    },
  });

  const deleteScenarioMutation = useMutation({
    mutationFn: ({ planId, scenarioId }: { planId: number; scenarioId: number }) =>
      deleteTaxPlanScenario(planId, scenarioId),
    onSuccess: async bundle => {
      await queryClient.invalidateQueries({ queryKey: taxPlanKeys.all });
      setSelectedPlanId(bundle.plan.id);
      toast({ title: 'Scenario removed', description: 'The scenario was deleted.' });
    },
  });

  const isMutating =
    createDefaultMutation.isPending ||
    savePlanMutation.isPending ||
    deletePlanMutation.isPending ||
    createScenarioMutation.isPending ||
    updateScenarioMutation.isPending ||
    deleteScenarioMutation.isPending;

  const handleSavePlan = async () => {
    if (!draft) return;
    await savePlanMutation.mutateAsync({
      id: draft.id,
      data: {
        name: draft.name,
        taxYear: draft.taxYear,
        province: draft.province,
        household: draft.household,
        personA: draft.personA,
        personB: draft.personB,
      },
    });
  };

  if (isLoading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-24 w-full" />
        <Skeleton className="h-80 w-full" />
        <Skeleton className="h-80 w-full" />
      </div>
    );
  }

  if (!bundles.length || !draft || !selectedBundle) {
    return (
      <div className="space-y-6">
        <Card>
          <CardHeader>
            <CardTitle>Tax Planning</CardTitle>
            <CardDescription>
              Build a couple-focused Manitoba optimizer for RRSP, FHSA, TFSA, HBP, and spousal RRSP tradeoffs.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <Alert>
              <AlertTitle>No plan yet</AlertTitle>
              <AlertDescription>
                Create a default household plan, then adjust the incomes, room, balances, and home target to compare scenarios.
              </AlertDescription>
            </Alert>
            <Button onClick={() => createDefaultMutation.mutate()} disabled={isMutating}>
              {createDefaultMutation.isPending ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <Plus className="mr-2 h-4 w-4" />
              )}
              Create Default Plan
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Tax Planning</CardTitle>
          <CardDescription>
            Deterministic Winnipeg household planner for RRSP, FHSA, TFSA, HBP, and spousal RRSP allocation.
          </CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div className="w-full max-w-md space-y-2">
            <Label>Active plan</Label>
            <Select
              value={String(selectedPlanId)}
              onValueChange={value => setSelectedPlanId(Number(value))}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select a plan" />
              </SelectTrigger>
              <SelectContent>
                {bundles.map(bundle => (
                  <SelectItem key={bundle.plan.id} value={String(bundle.plan.id)}>
                    {bundle.plan.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="flex flex-wrap gap-2">
            <Button variant="outline" onClick={() => createDefaultMutation.mutate()} disabled={isMutating}>
              <RefreshCw className="mr-2 h-4 w-4" />
              New Default Plan
            </Button>
            <Button variant="outline" onClick={() => deletePlanMutation.mutate(selectedBundle.plan.id)} disabled={isMutating}>
              <Trash2 className="mr-2 h-4 w-4" />
              Delete Plan
            </Button>
            <Button onClick={handleSavePlan} disabled={isMutating}>
              {savePlanMutation.isPending ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <Save className="mr-2 h-4 w-4" />
              )}
              Save Inputs
            </Button>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Household Inputs</CardTitle>
          <CardDescription>Manual inputs for the two-spouse household and shared home target.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
            <div className="space-y-2 md:col-span-2 xl:col-span-4">
              <Label htmlFor="plan-name">Plan name</Label>
              <Input
                id="plan-name"
                value={draft.name}
                onChange={event => setDraft(current => (current ? { ...current, name: event.target.value } : current))}
              />
            </div>
            <NumberField
              id="tax-year"
              label="Tax year"
              value={draft.taxYear}
              onChange={value => setDraft(current => (current ? { ...current, taxYear: Math.round(value || 2026) } : current))}
              step="1"
            />
            <div className="space-y-2">
              <Label>Province</Label>
              <Select
                value={draft.province}
                onValueChange={value =>
                  setDraft(current => (current ? { ...current, province: value as 'MB' } : current))
                }
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select province" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="MB">Manitoba</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="purchase-date">Target purchase date</Label>
              <Input
                id="purchase-date"
                type="date"
                value={toDateInput(draft.household.targetPurchaseDate)}
                onChange={event =>
                  setDraft(current =>
                    current
                      ? {
                          ...current,
                          household: {
                            ...current.household,
                            targetPurchaseDate: fromDateInput(event.target.value),
                          },
                        }
                      : current
                  )
                }
              />
            </div>
            <NumberField
              id="home-price"
              label="Target home price"
              value={draft.household.targetHomePrice}
              onChange={value =>
                setDraft(current =>
                  current
                    ? { ...current, household: { ...current.household, targetHomePrice: value } }
                    : current
                )
              }
            />
            <NumberField
              id="down-payment"
              label="Desired down payment"
              value={draft.household.desiredDownPayment}
              onChange={value =>
                setDraft(current =>
                  current
                    ? { ...current, household: { ...current.household, desiredDownPayment: value } }
                    : current
                )
              }
            />
            <NumberField
              id="current-home-savings"
              label="Current down payment savings"
              value={draft.household.currentDownPaymentSavings}
              onChange={value =>
                setDraft(current =>
                  current
                    ? {
                        ...current,
                        household: { ...current.household, currentDownPaymentSavings: value },
                      }
                    : current
                )
              }
            />
            <NumberField
              id="monthly-available-savings"
              label="Monthly available savings"
              value={draft.household.monthlyAvailableSavings}
              onChange={value =>
                setDraft(current =>
                  current
                    ? {
                        ...current,
                        household: { ...current.household, monthlyAvailableSavings: value },
                      }
                    : current
                )
              }
            />
            <NumberField
              id="minimum-cash-reserve"
              label="Minimum cash reserve"
              value={draft.household.minimumCashReserve}
              onChange={value =>
                setDraft(current =>
                  current
                    ? { ...current, household: { ...current.household, minimumCashReserve: value } }
                    : current
                )
              }
            />
            <div className="md:col-span-2 xl:col-span-4">
              <CheckboxField
                id="both-renting"
                label="Both currently renting in Manitoba"
                checked={draft.household.bothRentingCurrently}
                onChange={value =>
                  setDraft(current =>
                    current
                      ? { ...current, household: { ...current.household, bothRentingCurrently: value } }
                      : current
                  )
                }
              />
            </div>
          </div>

          <div className="grid gap-6 xl:grid-cols-2">
            <PersonSection
              personKey="personA"
              person={draft.personA}
              onChange={person => setDraft(current => (current ? { ...current, personA: person } : current))}
            />
            <PersonSection
              personKey="personB"
              person={draft.personB}
              onChange={person => setDraft(current => (current ? { ...current, personB: person } : current))}
            />
          </div>
        </CardContent>
      </Card>

      {recommendedScenario && (
        <Card>
          <CardHeader>
            <CardTitle>Recommended Plan</CardTitle>
            <CardDescription>
              The leading scenario uses {scenarioModeLabel(recommendedScenario.mode)} logic and explains the contribution ordering.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Section 1: Family Net Tax KPI Card */}
            <FamilyNetTaxKpiCard summary={recommendedScenario.result.summary} />

            {/* Bracket Threshold Insight Card */}
            <BracketThresholdInsightCard people={recommendedScenario.result.people} />

            <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
              <Card className="border-border/60">
                <CardHeader className="pb-2">
                  <CardDescription>Estimated tax savings</CardDescription>
                  <CardTitle>{currencyFormatter.format(recommendedScenario.result.summary.estimatedTaxSavings)}</CardTitle>
                </CardHeader>
              </Card>
              <Card className="border-border/60">
                <CardHeader className="pb-2">
                  <CardDescription>Projected home funds</CardDescription>
                  <CardTitle>{currencyFormatter.format(recommendedScenario.result.summary.totalProjectedHomeFunds)}</CardTitle>
                </CardHeader>
              </Card>
              <Card className="border-border/60">
                <CardHeader className="pb-2">
                  <CardDescription>FHSA used</CardDescription>
                  <CardTitle>{currencyFormatter.format(recommendedScenario.result.summary.fhsaUsed)}</CardTitle>
                </CardHeader>
              </Card>
              <Card className="border-border/60">
                <CardHeader className="pb-2">
                  <CardDescription>HBP capacity</CardDescription>
                  <CardTitle>{currencyFormatter.format(recommendedScenario.result.summary.hbpCapacityUsed)}</CardTitle>
                </CardHeader>
              </Card>
            </div>

            <div className="grid gap-6 xl:grid-cols-[1.2fr,0.8fr]">
              <Card className="border-border/60">
                <CardHeader>
                  <CardTitle>Contribution ordering</CardTitle>
                  <CardDescription>Ranked recommendations with tax and home-funding effect.</CardDescription>
                </CardHeader>
                <CardContent className="space-y-3">
                  {recommendedScenario.result.recommendations.map((item, index) => (
                    <div key={item.key} className="rounded-lg border px-4 py-3">
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <p className="font-medium">
                            {index + 1}. Contribute {currencyFormatter.format(item.amount)} to{' '}
                            {item.contributor === 'personA' ? draft.personA.name : draft.personB.name}{' '}
                            {fieldLabelFromBucket(item.bucket)}
                            {item.annuitant
                              ? ` for ${item.annuitant === 'personA' ? draft.personA.name : draft.personB.name}`
                              : ''}
                          </p>
                          <p className="text-sm text-muted-foreground">{item.reason}</p>
                        </div>
                        <div className="text-right text-sm">
                          <p>Tax save: {currencyFormatter.format(item.estimatedTaxSavings)}</p>
                          <p>Home impact: {currencyFormatter.format(item.estimatedHomeFundsAdded)}</p>
                          <p>Rate: {decimalFormatter.format(item.marginalRate)}%</p>
                        </div>
                      </div>
                    </div>
                  ))}
                </CardContent>
              </Card>

              <div className="space-y-4">
                {/* Section 4: Spousal Amount Break-Even Card */}
                <SpousalAmountBreakEvenCard
                  spousalBreakEven={recommendedScenario.result.spousalBreakEven}
                  personBName={recommendedScenario.result.people.personB.name}
                />

                <Card className="border-border/60">
                  <CardHeader>
                    <CardTitle>Per-spouse impact</CardTitle>
                    <CardDescription>Before and after taxable income, tax, and home-accessible room.</CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    {(['personA', 'personB'] as TaxPersonKey[]).map(personKey => {
                      const personResult = recommendedScenario.result.people[personKey];
                      return (
                        <div key={personKey} className="rounded-lg border px-4 py-3">
                          <p className="font-medium">{personResult.name}</p>
                          <div className="mt-2 grid gap-2 text-sm text-muted-foreground">
                            <p>
                              Taxable income: {currencyFormatter.format(personResult.taxableIncomeBefore)} →{' '}
                              {currencyFormatter.format(personResult.taxableIncomeAfter)}
                            </p>
                            <p>
                              Estimated tax: {currencyFormatter.format(personResult.estimatedTaxBefore)} →{' '}
                              {currencyFormatter.format(personResult.estimatedTaxAfter)}
                            </p>
                            <p>Estimated savings: {currencyFormatter.format(personResult.estimatedTaxSavings)}</p>
                            <p>FHSA withdrawal capacity: {currencyFormatter.format(personResult.fhsaWithdrawalCapacity)}</p>
                            <p>HBP capacity: {currencyFormatter.format(personResult.hbpCapacity)}</p>
                          </div>
                        </div>
                      );
                    })}
                  </CardContent>
                </Card>
              </div>
            </div>

            {/* Section 3: Tuition Transfer Recommendation (conditional) */}
            {recommendedScenario.result.tuitionTransfer !== null && (
              <TuitionTransferRecommendationCard
                tuitionTransfer={recommendedScenario.result.tuitionTransfer}
                personAName={recommendedScenario.result.people.personA.name}
                personBName={recommendedScenario.result.people.personB.name}
              />
            )}

            {/* Bracket Waterfall — per person */}
            <div className="space-y-3">
              {(['personA', 'personB'] as TaxPersonKey[]).map(personKey => {
                const personResult = recommendedScenario.result.people[personKey];
                return (
                  <DeductionWaterfallChart
                    key={personKey}
                    personName={personResult.name}
                    personResult={personResult}
                  />
                );
              })}
            </div>

            {/* Section 2: Credits Breakdown Table — per person */}
            <div className="space-y-3">
              {(['personA', 'personB'] as TaxPersonKey[]).map(personKey => {
                const personResult = recommendedScenario.result.people[personKey];
                return (
                  <CreditsBreakdownTable
                    key={personKey}
                    personName={personResult.name}
                    federalCredits={personResult.federalCredits}
                    provincialCredits={personResult.provincialCredits}
                    payroll={personResult.payroll}
                  />
                );
              })}
            </div>

            {/* Section 5: Multi-Year Timeline */}
            <MultiYearTimeline multiYear={recommendedScenario.multiYear} />
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader>
          <CardTitle>Scenario Comparison</CardTitle>
          <CardDescription>Compare balanced, tax-max, home-max, recommended, and manual plans side by side.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex flex-wrap gap-2">
            <Button
              variant="outline"
              onClick={() =>
                createScenarioMutation.mutate({
                  planId: selectedBundle.plan.id,
                  data: { name: `Manual ${selectedBundle.scenarios.length + 1}`, mode: 'manual', overrides: buildEmptyScenarioOverrides() },
                })
              }
              disabled={isMutating}
            >
              <Plus className="mr-2 h-4 w-4" />
              Add Manual Scenario
            </Button>
          </div>
          <div className="grid gap-4 xl:grid-cols-2">
            {selectedBundle.scenarios.map(scenario => (
              <Card key={scenario.id} className="border-border/60">
                <CardHeader className="flex flex-row items-start justify-between gap-4">
                  <div>
                    <CardTitle>{scenario.name}</CardTitle>
                    <CardDescription>{scenarioModeLabel(scenario.mode)}</CardDescription>
                  </div>
                  {!['recommended', 'balanced', 'tax-max', 'home-max'].includes(scenario.mode) && (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() =>
                        deleteScenarioMutation.mutate({
                          planId: selectedBundle.plan.id,
                          scenarioId: scenario.id,
                        })
                      }
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  )}
                </CardHeader>
                <CardContent className="space-y-3 text-sm">
                  <div className="grid gap-2 md:grid-cols-2">
                    <p>Total contribution: {currencyFormatter.format(scenario.result.summary.totalContribution)}</p>
                    <p>Tax savings: {currencyFormatter.format(scenario.result.summary.estimatedTaxSavings)}</p>
                    <p>Home funds: {currencyFormatter.format(scenario.result.summary.totalProjectedHomeFunds)}</p>
                    <p>FHSA used: {currencyFormatter.format(scenario.result.summary.fhsaUsed)}</p>
                    <p>HBP capacity: {currencyFormatter.format(scenario.result.summary.hbpCapacityUsed)}</p>
                    <p>TFSA ending balance: {currencyFormatter.format(scenario.result.summary.tfsaEndingBalance)}</p>
                    <p>Shortfall: {currencyFormatter.format(scenario.result.summary.shortfall)}</p>
                    <p>Warnings: {scenario.result.summary.warningsCount}</p>
                  </div>
                  {scenario.mode === 'manual' && (
                    <ManualScenarioEditor
                      scenario={scenario}
                      planId={selectedBundle.plan.id}
                      onSave={payload =>
                        updateScenarioMutation.mutate({
                          planId: selectedBundle.plan.id,
                          scenarioId: scenario.id,
                          data: payload,
                        })
                      }
                    />
                  )}
                </CardContent>
              </Card>
            ))}
          </div>
        </CardContent>
      </Card>

      {recommendedScenario && (
        <Card>
          <CardHeader>
            <CardTitle>Rules & Warnings</CardTitle>
            <CardDescription>
              Assumptions, planner caveats, and scenario-specific warnings for the active recommendation.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {recommendedScenario.result.warnings.length > 0 ? (
              recommendedScenario.result.warnings.map(warning => (
                <Alert key={warning.code} variant={warning.severity === 'warning' ? 'destructive' : 'default'}>
                  <AlertTitle>{warning.title}</AlertTitle>
                  <AlertDescription>{warning.message}</AlertDescription>
                </Alert>
              ))
            ) : (
              <Alert>
                <AlertTitle>No blocking warnings</AlertTitle>
                <AlertDescription>
                  The current recommended scenario stayed within the entered room and budget limits.
                </AlertDescription>
              </Alert>
            )}

            <div className="rounded-lg border px-4 py-3 text-sm text-muted-foreground">
              <p>Tax year: 2026 federal + Manitoba rates.</p>
              <p>FHSA annual / lifetime limit modeled: $8,000 / $40,000.</p>
              <p>TFSA annual limit modeled: $7,000.</p>
              <p>HBP withdrawal limit modeled: $60,000 per eligible spouse.</p>
              <p>
                Estimated taxes are planning estimates based on taxable-income brackets and do not include every credit, deduction, or filing nuance.
              </p>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
