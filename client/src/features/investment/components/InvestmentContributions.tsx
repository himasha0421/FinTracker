import { useMemo } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Pencil } from 'lucide-react';
import type { InvestmentContributionItem, InvestmentItem } from '@/features/investment/types';
import {
  formatCurrency,
  formatTypeLabel,
  getSignedContributionAmount,
} from '@/features/investment/utils';

type InvestmentContributionsProps = {
  isLoading: boolean;
  contributions: InvestmentContributionItem[];
  investmentsById: Map<number, InvestmentItem>;
  canAddContribution: boolean;
  onAddContribution: () => void;
  onEditContribution: (contribution: InvestmentContributionItem) => void;
};

export default function InvestmentContributions({
  isLoading,
  contributions,
  investmentsById,
  canAddContribution,
  onAddContribution,
  onEditContribution,
}: InvestmentContributionsProps) {
  const sortedContributions = useMemo(
    () =>
      [...contributions].sort(
        (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()
      ),
    [contributions]
  );

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <div>
          <CardTitle>Contribution History</CardTitle>
          <CardDescription>Track deposits and withdrawals</CardDescription>
        </div>
        <Button variant="outline" onClick={onAddContribution} disabled={!canAddContribution}>
          Add Contribution
        </Button>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <Skeleton className="h-[220px]" />
        ) : sortedContributions.length > 0 ? (
          <div className="divide-y divide-border">
            {sortedContributions.map(contribution => {
              const investment = investmentsById.get(contribution.investmentId);
              const currency = investment?.currency || 'USD';
              const signed = getSignedContributionAmount(contribution);
              return (
                <div
                  key={contribution.id}
                  className="flex flex-wrap items-center justify-between gap-3 py-3"
                >
                  <div>
                    <p className="font-medium">
                      {investment?.name || `Investment #${contribution.investmentId}`}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {new Date(contribution.date).toLocaleDateString()} •{' '}
                      {formatTypeLabel(contribution.type)}
                    </p>
                  </div>
                  <div className="flex items-center gap-3">
                    <span
                      className={`font-mono ${
                        signed >= 0 ? 'text-emerald-400' : 'text-red-400'
                      }`}
                    >
                      {signed >= 0 ? '+' : ''}
                      {formatCurrency(signed, currency)}
                    </span>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => onEditContribution(contribution)}
                    >
                      <Pencil className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <p className="text-sm text-muted-foreground">No contributions recorded yet.</p>
        )}
      </CardContent>
    </Card>
  );
}
