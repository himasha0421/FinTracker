import type { TaxOptimizationResult } from '@shared/taxPlanning';
import { HeroCard } from '@/components/composed/HeroCard';
import { currencyFormatter } from '../constants';

interface FamilyNetTaxKpiCardProps {
  summary: TaxOptimizationResult['summary'];
}

export function FamilyNetTaxKpiCard({ summary }: FamilyNetTaxKpiCardProps) {
  const { familyNetTaxBefore, familyNetTaxAfter, familyNetTaxDelta, totalRefundableCredits } = summary;
  return (
    <HeroCard accent="amber" contentClassName="space-y-3">
      <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">Family Tax Summary</p>
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <div>
          <p className="text-xs text-slate-400">Family Net Tax Before</p>
          <p className="text-lg font-semibold">{currencyFormatter.format(familyNetTaxBefore)}</p>
        </div>
        <div>
          <p className="text-xs text-slate-400">Family Net Tax After (incl. refundable)</p>
          <p className="text-lg font-semibold">{currencyFormatter.format(familyNetTaxAfter)}</p>
        </div>
        <div>
          <p className="text-xs text-slate-400">Total Tax Saved</p>
          <p className={`text-lg font-semibold ${familyNetTaxDelta > 0 ? 'text-emerald-300' : ''}`}>
            {currencyFormatter.format(familyNetTaxDelta)}
          </p>
        </div>
        {totalRefundableCredits > 0 && (
          <div>
            <p className="text-xs text-slate-400">MB Renters Credit</p>
            <p className="text-lg font-semibold text-sky-300">
              {currencyFormatter.format(totalRefundableCredits)}
            </p>
          </div>
        )}
      </div>
    </HeroCard>
  );
}
