import type { SpousalAmountBreakEven } from '@shared/taxPlanning';
import { currencyFormatter } from '../constants';

interface SpousalAmountBreakEvenCardProps {
  spousalBreakEven: SpousalAmountBreakEven;
  personBName: string;
}

export function SpousalAmountBreakEvenCard({
  spousalBreakEven,
  personBName,
}: SpousalAmountBreakEvenCardProps) {
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
