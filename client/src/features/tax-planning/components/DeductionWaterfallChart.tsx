import { useState } from 'react';
import type { TaxPersonResult } from '@shared/taxPlanning';
import { bracketColours as colours, bracketColoursDark as coloursDark } from '@/design/tokens';
import type { CombinedSlice, WaterfallStep } from '../types';
import { currencyFormatter } from '../constants';
import {
  computeCombinedBreakdown,
  computeBreakdownForIncome,
  buildDeductionLabel,
  buildScenarioLabel,
} from '../utils';

interface DeductionWaterfallChartProps {
  personName: string;
  personResult: TaxPersonResult;
}

export function DeductionWaterfallChart({ personName, personResult }: DeductionWaterfallChartProps) {
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
  const bracketColourSet = isCombined ? coloursDark : colours;

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
  const bracketThresholds = grossBreakdown
    .map(s => s.upTo)
    .filter(t => isFinite(t) && t < totalIncome);

  const fmtThreshold = (v: number) =>
    v >= 1000 ? `$${(v / 1000).toFixed(0)}K` : `$${v}`;

  return (
    <div className="rounded-lg border px-4 py-4 space-y-0.5">
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
          {step.deductionLabel && !!step.deductionAmount && step.deductionAmount > 0 && (
            <div className="flex items-center gap-1.5 py-1 text-[11px] pl-1">
              <span className="text-red-500 font-bold">↓</span>
              <span className="font-medium text-red-500/90">−{currencyFormatter.format(step.deductionAmount)}</span>
              <span className="text-muted-foreground/50">·</span>
              <span className="text-muted-foreground">{step.deductionLabel}</span>
            </div>
          )}

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
                    className={`${bracketColourSet[i % bracketColourSet.length]} flex items-center justify-center shrink-0`}
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
              <div
                className="flex-1 bg-muted/40"
                style={{
                  backgroundImage:
                    idx > 0
                      ? 'repeating-linear-gradient(-45deg, transparent, transparent 4px, rgba(0,0,0,0.05) 4px, rgba(0,0,0,0.05) 8px)'
                      : 'none',
                }}
              />
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

      <div className="flex flex-wrap gap-x-4 gap-y-1 pt-3">
        {activeSlices.map((slice, i) => {
          const label =
            isCombined && 'fedRate' in slice
              ? `${((slice as CombinedSlice).fedRate * 100).toFixed(1)}+${((slice as CombinedSlice).provRate * 100).toFixed(1)}% = ${(slice.rate * 100).toFixed(2)}%`
              : `${(slice.rate * 100).toFixed(1)}%`;
          return (
            <div key={i} className="flex items-center gap-1.5">
              <span className={`inline-block h-2.5 w-2.5 rounded-sm ${bracketColourSet[i % bracketColourSet.length]}`} />
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
