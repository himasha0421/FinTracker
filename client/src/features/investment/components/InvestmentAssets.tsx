import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Pencil } from 'lucide-react';
import type { InvestmentItem } from '@/features/investment/types';
import { formatCurrency, formatTypeLabel } from '@/features/investment/utils';
import { assetTypeGroups } from '@/features/investment/constants';

type InvestmentAssetsProps = {
  isLoading: boolean;
  investments: InvestmentItem[];
  contributionsByInvestment: Map<number, number>;
  accountsById: Map<number, string>;
  onEditInvestment: (investment: InvestmentItem) => void;
  onAddContribution: (investmentId?: number) => void;
};

export default function InvestmentAssets({
  isLoading,
  investments,
  contributionsByInvestment,
  accountsById,
  onEditInvestment,
  onAddContribution,
}: InvestmentAssetsProps) {
  if (isLoading) {
    return <Skeleton className="h-[220px]" />;
  }

  if (investments.length === 0) {
    return (
      <Card>
        <CardContent className="py-10 text-center text-muted-foreground">
          No assets tracked yet. Add one to start tracking.
        </CardContent>
      </Card>
    );
  }

  const renderAssetCard = (investment: InvestmentItem) => {
    const netByInvestment = contributionsByInvestment.get(investment.id) ?? 0;
    const linkedAccount = investment.accountId
      ? accountsById.get(investment.accountId)
      : undefined;
    const currency = investment.currency || 'USD';

    return (
      <Card key={investment.id}>
        <CardHeader className="flex flex-row items-start justify-between">
          <div>
            <CardTitle className="text-lg">{investment.name}</CardTitle>
            <CardDescription>
              {formatTypeLabel(investment.type)}
              {investment.symbol ? ` • ${investment.symbol}` : ''}
              {investment.institution ? ` • ${investment.institution}` : ''}
            </CardDescription>
          </div>
          <Button variant="ghost" size="icon" onClick={() => onEditInvestment(investment)}>
            <Pencil className="h-4 w-4" />
          </Button>
        </CardHeader>
        <CardContent className="space-y-2">
          <div className="flex items-center justify-between text-sm">
            <span>Current Value</span>
            <span className="font-medium">
              {formatCurrency(Number(investment.currentValue || 0), currency)}
            </span>
          </div>
          <div className="flex items-center justify-between text-sm">
            <span>Monthly Contribution</span>
            <span className="font-medium">
              {formatCurrency(Number(investment.monthlyContribution || 0), currency)}
            </span>
          </div>
          <div className="flex items-center justify-between text-sm">
            <span>Net Contributions</span>
            <span className="font-medium">
              {formatCurrency(Number(netByInvestment || 0), currency)}
            </span>
          </div>
          <div className="flex items-center justify-between text-sm">
            <span>Linked Account</span>
            <span className="text-muted-foreground">{linkedAccount || 'Not linked'}</span>
          </div>
          {investment.notes ? (
            <p className="text-xs text-muted-foreground">{investment.notes}</p>
          ) : null}
          <div className="flex justify-between pt-2">
            <Button variant="outline" size="sm" onClick={() => onAddContribution(investment.id)}>
              Add Contribution
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  };

  return (
    <div className="space-y-8">
      {assetTypeGroups.map(group => {
        const groupInvestments = investments.filter(investment =>
          group.types.includes(investment.type)
        );

        return (
          <section key={group.key} className="space-y-4">
            <div>
              <h3 className="text-lg font-semibold">{group.title}</h3>
              <p className="text-sm text-muted-foreground">{group.description}</p>
            </div>

            {groupInvestments.length === 0 ? (
              <Card>
                <CardContent className="py-6 text-sm text-muted-foreground">
                  No assets in this category yet.
                </CardContent>
              </Card>
            ) : (
              <div className="grid gap-6 md:grid-cols-2">
                {groupInvestments.map(renderAssetCard)}
              </div>
            )}
          </section>
        );
      })}
    </div>
  );
}
