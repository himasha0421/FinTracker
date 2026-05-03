import type { TaxPersonKey, TaxPersonResult } from '@shared/taxPlanning';
import { currencyFormatter } from '../constants';

interface BracketThresholdInsightCardProps {
  people: Record<TaxPersonKey, TaxPersonResult>;
}

export function BracketThresholdInsightCard({ people }: BracketThresholdInsightCardProps) {
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
