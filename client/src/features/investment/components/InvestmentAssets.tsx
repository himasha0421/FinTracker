import { Card, CardContent } from '@/components/ui/card';
import { HeroCard } from '@/components/composed/HeroCard';
import { SectionCard, SectionCardHeader } from '@/components/composed/SectionCard';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Pencil, Layers3, TrendingDown, TrendingUp } from 'lucide-react';
import { cn } from '@/lib/utils';
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

  const totalAssetValue = investments.reduce(
    (sum, inv) => sum + Number(inv.currentValue || 0),
    0
  );

  const renderAssetCard = (investment: InvestmentItem) => {
    const netByInvestment = contributionsByInvestment.get(investment.id) ?? 0;
    const currentValue = Number(investment.currentValue || 0);
    const growth = currentValue - netByInvestment;
    const growthPositive = growth >= 0;
    const linkedAccount = investment.accountId
      ? accountsById.get(investment.accountId)
      : undefined;
    const currency = investment.currency || 'USD';

    return (
      <SectionCard key={investment.id} radius="md">
        <SectionCardHeader
          title={investment.name}
          titleClassName="text-base font-bold"
          className="space-y-3"
        >
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <div className="mt-1 text-xs text-slate-300">
                {formatTypeLabel(investment.type)}
                {investment.symbol ? ` • ${investment.symbol}` : ''}
                {investment.institution ? ` • ${investment.institution}` : ''}
              </div>
            </div>
            <Button
              variant="ghost"
              size="icon"
              className="shrink-0 rounded-full text-slate-500 hover:bg-slate-900 hover:text-white"
              onClick={() => onEditInvestment(investment)}
            >
              <Pencil className="h-4 w-4" />
            </Button>
          </div>

          <div className="flex flex-wrap gap-2">
            <span className="rounded-full bg-slate-200 px-2.5 py-1 text-[11px] text-slate-600">
              {linkedAccount || 'No linked account'}
            </span>
          </div>
        </SectionCardHeader>

        <CardContent className="space-y-4 p-5">
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="rounded-2xl bg-slate-950 p-3 text-white">
              <div className="text-[11px] uppercase tracking-[0.2em] text-slate-300">
                Current Value
              </div>
              <div className="mt-2 text-lg font-semibold text-white">
                {formatCurrency(currentValue, currency)}
              </div>
            </div>
            <div className="rounded-2xl bg-slate-100 p-3">
              <div className="text-[11px] uppercase tracking-[0.2em] text-slate-500">
                Monthly
              </div>
              <div className="mt-2 text-lg font-semibold text-slate-900">
                {formatCurrency(Number(investment.monthlyContribution || 0), currency)}
              </div>
            </div>
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            <div className="rounded-2xl border border-slate-200 px-3 py-3">
              <div className="text-[11px] uppercase tracking-[0.2em] text-slate-500">
                Net Contributions
              </div>
              <div className="mt-2 text-sm font-semibold text-slate-900">
                {formatCurrency(netByInvestment, currency)}
              </div>
            </div>
            <div className="rounded-2xl border border-slate-200 px-3 py-3">
              <div className="text-[11px] uppercase tracking-[0.2em] text-slate-500">Delta</div>
              <div
                className={cn(
                  'mt-2 flex items-center gap-1 text-sm font-semibold',
                  growthPositive ? 'text-emerald-600' : 'text-rose-600'
                )}
              >
                {growthPositive ? (
                  <TrendingUp className="h-4 w-4" />
                ) : (
                  <TrendingDown className="h-4 w-4" />
                )}
                {formatCurrency(growth, currency)}
              </div>
            </div>
          </div>

          {investment.notes ? (
            <div className="rounded-2xl bg-slate-50 px-3 py-3 text-sm text-slate-600">
              {investment.notes}
            </div>
          ) : null}

          <Button
            variant="outline"
            size="sm"
            className="w-full"
            onClick={() => onAddContribution(investment.id)}
          >
            Add Contribution
          </Button>
        </CardContent>
      </SectionCard>
    );
  };

  return (
    <div className="space-y-6">
      <HeroCard accent="violet">
        <div className="space-y-6">
          <div className="space-y-3">
            <div className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-3 py-1 text-xs uppercase tracking-[0.26em] text-purple-100/80">
              <Layers3 className="h-3.5 w-3.5" />
              Asset Registry
            </div>
            <div>
              <h2 className="text-3xl font-semibold tracking-tight sm:text-4xl">
                Physical & overseas assets
              </h2>
              <p className="mt-2 max-w-2xl text-sm text-slate-300">
                Track long-term holdings like property, vehicles, and foreign investments
                alongside your liquid portfolio.
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-end gap-6">
            <div>
              <div className="text-xs uppercase tracking-[0.24em] text-slate-400">
                Total asset value
              </div>
              <div className="mt-2 text-4xl font-semibold sm:text-5xl">
                {formatCurrency(totalAssetValue)}
              </div>
            </div>
            <div className="text-xs text-slate-400">
              {investments.length} asset{investments.length === 1 ? '' : 's'} tracked
            </div>
          </div>
        </div>
      </HeroCard>

      {investments.length === 0 ? (
        <Card className="rounded-[24px] border border-slate-200/80">
          <CardContent className="py-10 text-center text-sm text-slate-500">
            No assets tracked yet. Add one to start tracking.
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-8">
          {assetTypeGroups.map(group => {
            const groupInvestments = investments.filter(investment =>
              (group.types as readonly string[]).includes(investment.type)
            );

            if (groupInvestments.length === 0) return null;

            return (
              <section key={group.key} className="space-y-4">
                <div>
                  <div className="inline-flex items-center gap-2 rounded-full bg-slate-950 px-2.5 py-1 text-[11px] uppercase tracking-[0.2em] text-slate-50">
                    {group.title}
                  </div>
                  <p className="mt-2 text-sm text-slate-500">{group.description}</p>
                </div>

                <div className="grid gap-6 md:grid-cols-2">
                  {groupInvestments.map(renderAssetCard)}
                </div>
              </section>
            );
          })}
        </div>
      )}
    </div>
  );
}
