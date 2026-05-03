import { useMemo, useState } from 'react';
import {
  Line,
  LineChart,
  CartesianGrid,
  XAxis,
  YAxis,
  Tooltip as RechartsTooltip,
  ResponsiveContainer,
} from 'recharts';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { ChevronDown, ChevronRight, Pencil, Wallet, TrendingUp } from 'lucide-react';
import { cn } from '@/lib/utils';
import { HeroCard } from '@/components/composed/HeroCard';
import { SectionCard } from '@/components/composed/SectionCard';
import { sectionCardHeader } from '@/design/variants';
import type { InvestmentContributionItem, InvestmentItem } from '@/features/investment/types';
import {
  formatCurrency,
  formatTypeLabel,
  getSignedContributionAmount,
} from '@/features/investment/utils';

type MonthlyPoint = {
  month: string;
  total: number;
  breakdown: { name: string; amount: number; currency: string }[];
};

type TooltipProps = Readonly<{
  active?: boolean;
  payload?: { payload: MonthlyPoint }[];
  label?: string;
}>;

function ContributionTooltip({ active, payload, label }: TooltipProps) {
  if (!active || !payload?.length) return null;
  const data = payload[0].payload;
  if (data.total === 0 && data.breakdown.length === 0) return null;

  return (
    <div className="min-w-[180px] rounded-2xl border border-slate-200 bg-white p-3 shadow-lg">
      <div className="mb-2 text-[11px] font-semibold uppercase tracking-wide text-slate-400">
        {label}
      </div>
      <div className={cn('mb-2 text-base font-semibold', data.total >= 0 ? 'text-emerald-600' : 'text-rose-600')}>
        {data.total >= 0 ? '+' : ''}{formatCurrency(data.total)}
      </div>
      {data.breakdown.map(b => (
        <div key={b.name} className="flex items-center justify-between gap-4 text-xs text-slate-500">
          <span className="truncate">{b.name}</span>
          <span className={cn('font-mono shrink-0', b.amount >= 0 ? 'text-emerald-600' : 'text-rose-500')}>
            {b.amount >= 0 ? '+' : ''}{formatCurrency(b.amount, b.currency)}
          </span>
        </div>
      ))}
    </div>
  );
}

type ContributionRowProps = Readonly<{
  contribution: InvestmentContributionItem;
  currency: string;
  onEdit: (c: InvestmentContributionItem) => void;
}>;

function ContributionRow({ contribution, currency, onEdit }: ContributionRowProps) {
  const signed = getSignedContributionAmount(contribution);
  const isDeposit = signed >= 0;
  return (
    <div className="flex items-center justify-between gap-2 px-4 py-2.5">
      <div className="flex items-center gap-2 min-w-0">
        <span className={cn('h-1.5 w-1.5 shrink-0 rounded-full', isDeposit ? 'bg-emerald-500' : 'bg-rose-400')} />
        <span className="text-xs text-slate-500">
          {new Date(contribution.date).toLocaleDateString('en-US', { day: 'numeric', month: 'short' })}
        </span>
        <span className="truncate text-xs text-slate-400">{formatTypeLabel(contribution.type)}</span>
      </div>
      <div className="flex items-center gap-1 shrink-0">
        <span className={cn('font-mono text-xs font-semibold', isDeposit ? 'text-emerald-600' : 'text-rose-600')}>
          {isDeposit ? '+' : ''}{formatCurrency(signed, currency)}
        </span>
        <Button
          variant="ghost"
          size="icon"
          className="h-6 w-6 rounded-full text-slate-300 hover:bg-slate-100 hover:text-slate-600"
          onClick={() => onEdit(contribution)}
        >
          <Pencil className="h-2.5 w-2.5" />
        </Button>
      </div>
    </div>
  );
}

type InvestmentSubCardProps = Readonly<{
  investment: InvestmentItem | undefined;
  total: number;
  items: InvestmentContributionItem[];
  onEditContribution: (c: InvestmentContributionItem) => void;
}>;

function InvestmentSubCard({ investment, total, items, onEditContribution }: InvestmentSubCardProps) {
  const currency = investment?.currency || 'USD';
  return (
    <SectionCard radius="md">
      <div className={cn(sectionCardHeader(), 'flex items-center justify-between px-4 py-2.5')}>
        <div className="min-w-0">
          <div className="truncate text-xs font-semibold text-slate-900">
            {investment?.name || `Investment #${items[0].investmentId}`}
          </div>
          <div className="text-[11px] text-slate-400">
            {investment ? formatTypeLabel(investment.type) : ''}
            {investment?.symbol ? ` • ${investment.symbol}` : ''}
          </div>
        </div>
        <div className={cn('ml-3 shrink-0 text-xs font-semibold', total >= 0 ? 'text-emerald-600' : 'text-rose-600')}>
          {total >= 0 ? '+' : ''}{formatCurrency(total, currency)}
        </div>
      </div>
      <CardContent className="divide-y divide-slate-100 p-0">
        {items.map(c => (
          <ContributionRow key={c.id} contribution={c} currency={currency} onEdit={onEditContribution} />
        ))}
      </CardContent>
    </SectionCard>
  );
}

type InvestmentContributionsProps = Readonly<{
  isLoading: boolean;
  contributions: InvestmentContributionItem[];
  investmentsById: Map<number, InvestmentItem>;
  canAddContribution: boolean;
  onAddContribution: () => void;
  onEditContribution: (contribution: InvestmentContributionItem) => void;
}>;

export default function InvestmentContributions({
  isLoading,
  contributions,
  investmentsById,
  canAddContribution,
  onAddContribution,
  onEditContribution,
}: InvestmentContributionsProps) {
  const sortedContributions = useMemo(
    () => [...contributions].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()),
    [contributions]
  );

  const stats = useMemo(() => {
    let totalDeposited = 0;
    let totalWithdrawn = 0;
    const now = new Date();
    const thisMonthKey = `${now.getFullYear()}-${now.getMonth()}`;
    let thisMonth = 0;

    for (const c of contributions) {
      const signed = getSignedContributionAmount(c);
      if (signed >= 0) totalDeposited += signed;
      else totalWithdrawn += Math.abs(signed);
      const d = new Date(c.date);
      if (`${d.getFullYear()}-${d.getMonth()}` === thisMonthKey) thisMonth += signed;
    }

    return { totalDeposited, totalWithdrawn, net: totalDeposited - totalWithdrawn, thisMonth };
  }, [contributions]);

  const monthlyChartData = useMemo((): MonthlyPoint[] => {
    const map = new Map<string, { total: number; breakdown: Map<number, number> }>();

    for (const c of contributions) {
      const d = new Date(c.date);
      const key = `${d.getFullYear()}-${d.getMonth()}`;
      const signed = getSignedContributionAmount(c);
      const existing = map.get(key);
      if (existing) {
        existing.total += signed;
        existing.breakdown.set(c.investmentId, (existing.breakdown.get(c.investmentId) ?? 0) + signed);
      } else {
        const breakdown = new Map<number, number>();
        breakdown.set(c.investmentId, signed);
        map.set(key, { total: signed, breakdown });
      }
    }

    const now = new Date();
    return Array.from({ length: 12 }, (_, i) => {
      const date = new Date(now.getFullYear(), now.getMonth() - (11 - i), 1);
      const key = `${date.getFullYear()}-${date.getMonth()}`;
      const entry = map.get(key);
      const month = date.toLocaleString('en-US', { month: 'short' });
      if (!entry) return { month, total: 0, breakdown: [] };

      const breakdown = Array.from(entry.breakdown.entries()).map(([id, amount]) => {
        const inv = investmentsById.get(id);
        return { name: inv?.name ?? `#${id}`, amount, currency: inv?.currency ?? 'USD' };
      });

      return { month, total: entry.total, breakdown };
    });
  }, [contributions, investmentsById]);

  const [expandedMonths, setExpandedMonths] = useState<Set<string>>(new Set());

  const toggleMonth = (label: string) =>
    setExpandedMonths(prev => {
      const next = new Set(prev);
      if (next.has(label)) next.delete(label);
      else next.add(label);
      return next;
    });

  const groupedByMonth = useMemo(() => {
    type InvGroup = {
      investment: InvestmentItem | undefined;
      total: number;
      items: InvestmentContributionItem[];
    };
    type MonthGroup = {
      label: string;
      monthTotal: number;
      investments: InvGroup[];
    };

    const monthMap = new Map<string, { label: string; monthTotal: number; invMap: Map<number, InvGroup> }>();

    for (const c of sortedContributions) {
      const d = new Date(c.date);
      const key = `${d.getFullYear()}-${String(d.getMonth()).padStart(2, '0')}`;
      const label = d.toLocaleString('en-US', { month: 'long', year: 'numeric' });
      const signed = getSignedContributionAmount(c);

      if (!monthMap.has(key)) {
        monthMap.set(key, { label, monthTotal: 0, invMap: new Map() });
      }
      const month = monthMap.get(key)!;
      month.monthTotal += signed;

      const existing = month.invMap.get(c.investmentId);
      if (existing) {
        existing.total += signed;
        existing.items.push(c);
      } else {
        month.invMap.set(c.investmentId, {
          investment: investmentsById.get(c.investmentId),
          total: signed,
          items: [c],
        });
      }
    }

    return Array.from(monthMap.entries())
      .sort(([a], [b]) => b.localeCompare(a))
      .map(([, { label, monthTotal, invMap }]): MonthGroup => ({
        label,
        monthTotal,
        investments: Array.from(invMap.values()).sort((a, b) => Math.abs(b.total) - Math.abs(a.total)),
      }));
  }, [sortedContributions, investmentsById]);

  return (
    <div className="space-y-6">
      {/* Hero */}
      <HeroCard accent="emerald">
          <div className="space-y-6">
            <div className="space-y-3">
              <div className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-3 py-1 text-xs uppercase tracking-[0.26em] text-emerald-100/80">
                <Wallet className="h-3.5 w-3.5" />
                Contribution History
              </div>
              <div>
                <h2 className="text-3xl font-semibold tracking-tight sm:text-4xl">
                  Track every deposit & withdrawal
                </h2>
                <p className="mt-2 max-w-2xl text-sm text-slate-300">
                  A running record of capital you've put in and taken out across all investments.
                </p>
              </div>
            </div>

            <div className="grid gap-3 sm:grid-cols-4">
              <div className="rounded-2xl border border-white/10 bg-white/5 px-4 py-3">
                <div className="text-xs uppercase tracking-wide text-slate-400">Net</div>
                <div className={cn('mt-1 text-lg font-semibold', stats.net >= 0 ? 'text-emerald-400' : 'text-rose-400')}>
                  {formatCurrency(stats.net)}
                </div>
              </div>
              <div className="rounded-2xl border border-white/10 bg-white/5 px-4 py-3">
                <div className="text-xs uppercase tracking-wide text-slate-400">Total Deposited</div>
                <div className="mt-1 text-lg font-semibold text-emerald-400">
                  {formatCurrency(stats.totalDeposited)}
                </div>
              </div>
              <div className="rounded-2xl border border-white/10 bg-white/5 px-4 py-3">
                <div className="text-xs uppercase tracking-wide text-slate-400">Total Withdrawn</div>
                <div className="mt-1 text-lg font-semibold text-rose-400">
                  {formatCurrency(stats.totalWithdrawn)}
                </div>
              </div>
              <div className="rounded-2xl border border-white/10 bg-white/5 px-4 py-3">
                <div className="flex items-center gap-1 text-xs uppercase tracking-wide text-slate-400">
                  <TrendingUp className="h-3 w-3" />
                  This Month
                </div>
                <div className={cn('mt-1 text-lg font-semibold', stats.thisMonth >= 0 ? 'text-slate-50' : 'text-rose-400')}>
                  {stats.thisMonth >= 0 ? '+' : ''}{formatCurrency(stats.thisMonth)}
                </div>
              </div>
            </div>

            {/* Monthly chart */}
            <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
              <div className="mb-3 text-xs uppercase tracking-[0.22em] text-slate-400">
                Monthly flow — last 12 months
              </div>
              <div className="h-[160px]">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={monthlyChartData} margin={{ top: 4, right: 4, left: -16, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.06)" />
                    <XAxis
                      dataKey="month"
                      tickLine={false}
                      axisLine={false}
                      tick={{ fill: '#94a3b8', fontSize: 11 }}
                    />
                    <YAxis
                      tickLine={false}
                      axisLine={false}
                      tick={{ fill: '#94a3b8', fontSize: 11 }}
                      tickFormatter={v => `${Math.round(Number(v) / 1000)}k`}
                    />
                    <RechartsTooltip
                      content={<ContributionTooltip />}
                      cursor={{ stroke: 'rgba(255,255,255,0.15)', strokeWidth: 1 }}
                    />
                    <Line
                      type="monotone"
                      dataKey="total"
                      stroke="#34d399"
                      strokeWidth={2.5}
                      dot={{ r: 3, fill: '#34d399', strokeWidth: 0 }}
                      activeDot={{ r: 5, fill: '#34d399', strokeWidth: 0 }}
                    />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </div>

            <Button
              onClick={onAddContribution}
              disabled={!canAddContribution}
              className="bg-white text-slate-950 hover:bg-slate-200"
            >
              Add Contribution
            </Button>
          </div>
      </HeroCard>

      {isLoading && <Skeleton className="h-[220px]" />}

      {!isLoading && groupedByMonth.length === 0 && (
        <Card className="rounded-[24px] border border-slate-200/80">
          <CardContent className="py-10 text-center text-sm text-slate-500">
            No contributions recorded yet.
          </CardContent>
        </Card>
      )}

      {!isLoading && groupedByMonth.length > 0 && (
        <div className="space-y-8">
          {groupedByMonth.map(({ label, monthTotal, investments }) => {
            const isCollapsed = !expandedMonths.has(label);
            return (
              <div key={label} className="space-y-3">
                {/* Month header */}
                <button
                  type="button"
                  onClick={() => toggleMonth(label)}
                  className="flex w-full items-center justify-between px-1 text-left"
                >
                  <div className="flex items-center gap-2">
                    {isCollapsed ? (
                      <ChevronRight className="h-4 w-4 text-slate-400" />
                    ) : (
                      <ChevronDown className="h-4 w-4 text-slate-400" />
                    )}
                    <span className="text-sm font-semibold text-slate-700">{label}</span>
                    <span className="text-xs text-slate-400">{investments.length} investment{investments.length === 1 ? '' : 's'}</span>
                  </div>
                  <span className={cn('text-sm font-semibold', monthTotal >= 0 ? 'text-emerald-600' : 'text-rose-600')}>
                    {monthTotal >= 0 ? '+' : ''}{formatCurrency(monthTotal)}
                  </span>
                </button>

                {/* Two-column grid of investment sub-cards */}
                {!isCollapsed && (
                  <div className="grid gap-3 md:grid-cols-2">
                    {investments.map(({ investment, total, items }) => (
                      <InvestmentSubCard
                        key={investment?.id ?? items[0].investmentId}
                        investment={investment}
                        total={total}
                        items={items}
                        onEditContribution={onEditContribution}
                      />
                    ))}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
