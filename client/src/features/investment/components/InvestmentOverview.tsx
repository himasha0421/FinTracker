import { useEffect, useMemo, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { HeroCard } from '@/components/composed/HeroCard';
import { GlassTile } from '@/components/composed/GlassTile';
import { statusColours } from '@/design/tokens';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Skeleton } from '@/components/ui/skeleton';
import type { InvestmentItem } from '@/features/investment/types';
import { formatCurrency } from '@/features/investment/utils';
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Line,
  LineChart,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip as RechartsTooltip,
  XAxis,
  YAxis,
} from 'recharts';
import {
  ArrowUpRight,
  BarChart3,
  Layers3,
  PieChart as PieChartIcon,
  TrendingDown,
  TrendingUp,
  Wallet,
} from 'lucide-react';

type AllocationItem = {
  type: string;
  name: string;
  value: number;
  color: string;
  count: number;
  monthlyContribution: number;
  items: InvestmentItem[];
};

type ContributionPoint = {
  month: string;
  value: number;
};

type InvestmentOverviewProps = {
  isLoading: boolean;
  totalInvestmentValue: number;
  totalMonthlyContribution: number;
  monthlyContributionAssets: number;
  monthlyContributionHoldings: number;
  currentBalanceAssets: number;
  currentBalanceHoldings: number;
  gainLoss: number;
  gainLossPercent: string | null;
  allocationData: AllocationItem[];
  totalAllocationValue: number;
  contributionSeries: ContributionPoint[];
  contributionsByInvestment: Map<number, number>;
  accountsById: Map<number, string>;
  onEditInvestment: (investment: InvestmentItem) => void;
  onAddContribution: (investmentId?: number) => void;
};

const compactCurrencyFormatter = new Intl.NumberFormat('en-US', {
  notation: 'compact',
  maximumFractionDigits: 1,
});

const formatCompactCurrency = (value: number) => `$${compactCurrencyFormatter.format(value)}`;

const formatShare = (value: number, total: number) => {
  if (total <= 0) {
    return '0.0%';
  }

  return `${((value / total) * 100).toFixed(1)}%`;
};

export default function InvestmentOverview({
  isLoading,
  totalInvestmentValue,
  totalMonthlyContribution,
  monthlyContributionAssets,
  monthlyContributionHoldings,
  currentBalanceAssets,
  currentBalanceHoldings,
  gainLoss,
  gainLossPercent,
  allocationData,
  totalAllocationValue,
  contributionSeries,
  contributionsByInvestment,
  accountsById,
  onEditInvestment,
  onAddContribution,
}: Readonly<InvestmentOverviewProps>) {
  const [selectedType, setSelectedType] = useState<string | null>(allocationData[0]?.type ?? null);
  const [isCategoryDialogOpen, setIsCategoryDialogOpen] = useState(false);

  useEffect(() => {
    if (allocationData.length === 0) {
      setSelectedType(null);
      setIsCategoryDialogOpen(false);
      return;
    }

    if (!selectedType || !allocationData.some(item => item.type === selectedType)) {
      setSelectedType(allocationData[0].type);
    }
  }, [allocationData, selectedType]);

  const selectedSlice =
    allocationData.find(item => item.type === selectedType) ?? allocationData[0] ?? null;

  const selectedSliceChartData = useMemo(() => {
    if (!selectedSlice) {
      return [];
    }

    return selectedSlice.items.slice(0, 6).map(item => ({
      id: item.id,
      name: item.symbol || item.name,
      value: Number(item.currentValue || 0),
    }));
  }, [selectedSlice]);

  const topSelectedItems = selectedSlice?.items.slice(0, 3) ?? [];

  const handleSelectSlice = (slice: AllocationItem, openDialog = false) => {
    setSelectedType(slice.type);
    if (openDialog) {
      setIsCategoryDialogOpen(true);
    }
  };

  if (isLoading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-[420px] w-full rounded-[28px]" />
        <div className="grid gap-4 lg:grid-cols-3">
          <Skeleton className="h-[220px] w-full rounded-[24px]" />
          <Skeleton className="h-[220px] w-full rounded-[24px]" />
          <Skeleton className="h-[220px] w-full rounded-[24px]" />
        </div>
      </div>
    );
  }

  return (
    <>
      <div className="space-y-6">
        <HeroCard accent="blue">
            <div className="grid gap-10 xl:grid-cols-[1.05fr_0.95fr]">
              <div className="space-y-8">
                <div className="space-y-3">
                  <div className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-3 py-1 text-xs uppercase tracking-[0.28em] text-sky-100/80">
                    <PieChartIcon className="h-3.5 w-3.5" />
                    Allocation Explorer
                  </div>
                  <div className="space-y-2">
                    <h2 className="text-3xl font-semibold tracking-tight sm:text-4xl">
                      Portfolio value at a glance
                    </h2>
                    <p className="max-w-xl text-sm text-slate-300">
                      Use the chart to jump into a category, then open a richer breakdown of the
                      positions inside it.
                    </p>
                  </div>
                </div>

                <div className="flex flex-wrap items-end gap-6">
                  <div>
                    <div className="text-xs uppercase tracking-[0.24em] text-slate-400">
                      Total portfolio
                    </div>
                    <div className="mt-2 text-4xl font-semibold sm:text-5xl">
                      {formatCurrency(totalInvestmentValue)}
                    </div>
                  </div>
                  <div
                    className={`inline-flex items-center gap-2 rounded-full px-4 py-2 text-sm font-medium ${
                      gainLoss >= 0 ? statusColours.gain.badge : statusColours.loss.badge
                    }`}
                  >
                    {gainLoss >= 0 ? (
                      <TrendingUp className="h-4 w-4" />
                    ) : (
                      <TrendingDown className="h-4 w-4" />
                    )}
                    <span>{formatCurrency(gainLoss)}</span>
                    {gainLossPercent ? <span>{gainLossPercent}% vs net inflows</span> : null}
                  </div>
                </div>

                <div className="grid gap-3 sm:grid-cols-3">
                  <GlassTile>
                    <div className="flex items-center justify-between text-slate-300">
                      <span className="text-sm">Monthly flow</span>
                      <ArrowUpRight className="h-4 w-4" />
                    </div>
                    <div className="mt-3 text-2xl font-semibold">
                      {formatCurrency(totalMonthlyContribution)}
                    </div>
                    <div className="mt-2 text-xs text-slate-400">
                      {formatCurrency(monthlyContributionHoldings)} in holdings and{' '}
                      {formatCurrency(monthlyContributionAssets)} in assets
                    </div>
                  </GlassTile>

                  <GlassTile>
                    <div className="flex items-center justify-between text-slate-300">
                      <span className="text-sm">Tracked categories</span>
                      <Layers3 className="h-4 w-4" />
                    </div>
                    <div className="mt-3 text-2xl font-semibold">{allocationData.length}</div>
                    <div className="mt-2 text-xs text-slate-400">
                      {allocationData.reduce((sum, item) => sum + item.count, 0)} positions across
                      the portfolio
                    </div>
                  </GlassTile>

                  <GlassTile>
                    <div className="flex items-center justify-between text-slate-300">
                      <span className="text-sm">Selected focus</span>
                      <Wallet className="h-4 w-4" />
                    </div>
                    {selectedSlice ? (
                      <>
                        <div className="mt-3 text-2xl font-semibold">{selectedSlice.name}</div>
                        <div className="mt-2 text-xs text-slate-400">
                          {selectedSlice.count} positions worth{' '}
                          {formatCurrency(selectedSlice.value)}
                        </div>
                      </>
                    ) : (
                      <div className="mt-3 text-sm text-slate-400">No allocation data yet.</div>
                    )}
                  </GlassTile>
                </div>
              </div>

              <GlassTile size="lg">
                {allocationData.length > 0 && selectedSlice ? (
                  <div className="grid gap-6 lg:grid-cols-[0.95fr_1.05fr]">
                    <div className="space-y-3">
                      <div className="text-sm font-medium text-slate-300">
                        Click a slice to open that category
                      </div>
                      <div className="relative mx-auto h-[260px] max-w-[260px]">
                        <ResponsiveContainer width="100%" height="100%">
                          <PieChart>
                            <Pie
                              data={allocationData}
                              dataKey="value"
                              innerRadius={72}
                              outerRadius={104}
                              paddingAngle={3}
                              onClick={slice => handleSelectSlice(slice as AllocationItem, true)}
                            >
                              {allocationData.map(item => {
                                const isSelected = item.type === selectedSlice.type;
                                return (
                                  <Cell
                                    key={item.type}
                                    fill={item.color}
                                    opacity={isSelected ? 1 : 0.62}
                                    stroke={isSelected ? '#e2e8f0' : 'transparent'}
                                    strokeWidth={isSelected ? 3 : 1}
                                    style={{ cursor: 'pointer' }}
                                  />
                                );
                              })}
                            </Pie>
                            <RechartsTooltip
                              formatter={(value: number) => formatCurrency(Number(value))}
                            />
                          </PieChart>
                        </ResponsiveContainer>
                        <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center text-center">
                          <div className="text-xs uppercase tracking-[0.24em] text-slate-400">
                            {selectedSlice.name}
                          </div>
                          <div className="mt-2 text-3xl font-semibold">
                            {formatShare(selectedSlice.value, totalAllocationValue)}
                          </div>
                          <div className="mt-1 text-xs text-slate-400">
                            {formatCurrency(selectedSlice.value)}
                          </div>
                        </div>
                      </div>
                    </div>

                    <div className="space-y-3">
                      <div className="flex items-center justify-between">
                        <div>
                          <div className="text-sm font-medium text-slate-100">Category ranking</div>
                          <div className="text-xs text-slate-400">Sorted by current value</div>
                        </div>
                        <Button
                          size="sm"
                          variant="outline"
                          className="border-white/15 bg-white/5 text-slate-100 hover:bg-white/10 hover:text-white"
                          onClick={() => setIsCategoryDialogOpen(true)}
                          disabled={!selectedSlice}
                        >
                          Open selected
                        </Button>
                      </div>

                      <div className="space-y-2">
                        {allocationData.map(item => {
                          const share =
                            totalAllocationValue > 0 ? item.value / totalAllocationValue : 0;
                          const isSelected = selectedSlice.type === item.type;

                          return (
                            <button
                              key={item.type}
                              type="button"
                              onClick={() => handleSelectSlice(item, true)}
                              className={`w-full rounded-2xl border px-4 py-3 text-left transition ${
                                isSelected
                                  ? 'border-white/20 bg-white/12 shadow-lg shadow-slate-950/30'
                                  : 'border-white/8 bg-black/10 hover:border-white/15 hover:bg-white/8'
                              }`}
                            >
                              <div className="flex items-center justify-between gap-4">
                                <div className="min-w-0">
                                  <div className="flex items-center gap-2">
                                    <span
                                      className="inline-block h-2.5 w-2.5 rounded-full"
                                      style={{ backgroundColor: item.color }}
                                    />
                                    <span className="truncate text-sm font-medium text-slate-100">
                                      {item.name}
                                    </span>
                                  </div>
                                  <div className="mt-1 text-xs text-slate-400">
                                    {item.count} positions •{' '}
                                    {formatCurrency(item.monthlyContribution)} monthly
                                  </div>
                                </div>
                                <div className="text-right">
                                  <div className="text-sm font-semibold text-slate-50">
                                    {formatCurrency(item.value)}
                                  </div>
                                  <div className="text-xs text-slate-400">
                                    {formatShare(item.value, totalAllocationValue)}
                                  </div>
                                </div>
                              </div>
                              <div className="mt-3 h-2 overflow-hidden rounded-full bg-white/8">
                                <div
                                  className="h-full rounded-full"
                                  style={{
                                    width: `${Math.max(share * 100, share > 0 ? 8 : 0)}%`,
                                    backgroundColor: item.color,
                                  }}
                                />
                              </div>
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="flex min-h-[320px] items-center justify-center text-sm text-slate-400">
                    Add investments to populate the allocation explorer.
                  </div>
                )}
              </GlassTile>
            </div>
        </HeroCard>

        <div className="grid gap-4 xl:grid-cols-[0.9fr_1.1fr_0.95fr]">
          <Card className="border-slate-200/80">
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-2 text-base">
                <Wallet className="h-4 w-4 text-sky-500" />
                Balance Mix
              </CardTitle>
              <CardDescription>How the portfolio is split today</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <div className="flex items-center justify-between text-sm">
                  <span>Holdings</span>
                  <span className="font-medium">{formatCurrency(currentBalanceHoldings)}</span>
                </div>
                <div className="h-2 overflow-hidden rounded-full bg-slate-100">
                  <div
                    className="h-full rounded-full bg-sky-500"
                    style={{
                      width: `${Math.max(
                        totalInvestmentValue > 0
                          ? (currentBalanceHoldings / totalInvestmentValue) * 100
                          : 0,
                        currentBalanceHoldings > 0 ? 6 : 0
                      )}%`,
                    }}
                  />
                </div>
              </div>

              <div className="space-y-2">
                <div className="flex items-center justify-between text-sm">
                  <span>Assets</span>
                  <span className="font-medium">{formatCurrency(currentBalanceAssets)}</span>
                </div>
                <div className="h-2 overflow-hidden rounded-full bg-slate-100">
                  <div
                    className="h-full rounded-full bg-amber-500"
                    style={{
                      width: `${Math.max(
                        totalInvestmentValue > 0
                          ? (currentBalanceAssets / totalInvestmentValue) * 100
                          : 0,
                        currentBalanceAssets > 0 ? 6 : 0
                      )}%`,
                    }}
                  />
                </div>
              </div>

              <div className="rounded-2xl bg-slate-50 p-4 text-sm text-slate-600">
                Holdings are liquid positions like ETFs, stocks, and deposits. Assets cover things
                like land or vehicles.
              </div>
            </CardContent>
          </Card>

          <Card className="border-slate-200/80">
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-2 text-base">
                <BarChart3 className="h-4 w-4 text-indigo-500" />
                Contribution Trend
              </CardTitle>
              <CardDescription>Net contributions over the last 12 months</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="h-[220px]">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={contributionSeries}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                    <XAxis dataKey="month" tickLine={false} axisLine={false} />
                    <YAxis
                      tickFormatter={value => formatCompactCurrency(Number(value))}
                      tickLine={false}
                      axisLine={false}
                      width={64}
                    />
                    <RechartsTooltip formatter={(value: number) => formatCurrency(Number(value))} />
                    <Line
                      type="monotone"
                      dataKey="value"
                      stroke="#4f46e5"
                      strokeWidth={3}
                      dot={{ r: 3, fill: '#4f46e5' }}
                      activeDot={{ r: 5 }}
                    />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>

          <Card className="border-slate-200/80">
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-2 text-base">
                <Layers3 className="h-4 w-4 text-emerald-500" />
                Selected Category
              </CardTitle>
              <CardDescription>
                Quick preview before opening the full category distribution
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {selectedSlice ? (
                <>
                  <div className="rounded-3xl border border-slate-200 bg-slate-50 p-4">
                    <div className="flex items-center justify-between gap-3">
                      <div>
                        <div className="text-lg font-semibold">{selectedSlice.name}</div>
                        <div className="text-sm text-slate-500">
                          {selectedSlice.count} positions •{' '}
                          {formatShare(selectedSlice.value, totalAllocationValue)}
                        </div>
                      </div>
                      <span
                        className="inline-block h-3.5 w-3.5 rounded-full"
                        style={{ backgroundColor: selectedSlice.color }}
                      />
                    </div>
                    <div className="mt-4 grid gap-3 sm:grid-cols-2">
                      <div>
                        <div className="text-xs uppercase tracking-wide text-slate-500">
                          Current value
                        </div>
                        <div className="mt-1 text-xl font-semibold">
                          {formatCurrency(selectedSlice.value)}
                        </div>
                      </div>
                      <div>
                        <div className="text-xs uppercase tracking-wide text-slate-500">
                          Monthly contribution
                        </div>
                        <div className="mt-1 text-xl font-semibold">
                          {formatCurrency(selectedSlice.monthlyContribution)}
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="space-y-2">
                    {topSelectedItems.map(item => (
                      <div
                        key={item.id}
                        className="flex items-center justify-between rounded-2xl border border-slate-200 px-4 py-3"
                      >
                        <div className="min-w-0">
                          <div className="truncate text-sm font-medium">{item.name}</div>
                          <div className="text-xs text-slate-500">
                            {item.symbol || item.institution || 'Tracked position'}
                          </div>
                        </div>
                        <div className="text-sm font-semibold">
                          {formatCurrency(Number(item.currentValue || 0), item.currency)}
                        </div>
                      </div>
                    ))}
                  </div>

                  <Button className="w-full" onClick={() => setIsCategoryDialogOpen(true)}>
                    Open {selectedSlice.name} breakdown
                  </Button>
                </>
              ) : (
                <div className="rounded-2xl bg-slate-50 p-4 text-sm text-slate-500">
                  Select a category once you add investments.
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>

      <Dialog open={isCategoryDialogOpen} onOpenChange={setIsCategoryDialogOpen}>
        <DialogContent className="max-h-[85vh] max-w-5xl overflow-hidden border border-slate-800 bg-slate-950 p-0 text-slate-50 sm:rounded-[32px]">
          {selectedSlice ? (
            <>
              <DialogHeader className="border-b border-white/10 px-6 py-5 sm:px-8">
                <div className="flex flex-wrap items-start justify-between gap-4">
                  <div className="space-y-2">
                    <div className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-3 py-1 text-xs uppercase tracking-[0.24em] text-slate-300">
                      <span
                        className="inline-block h-2.5 w-2.5 rounded-full"
                        style={{ backgroundColor: selectedSlice.color }}
                      />
                      {selectedSlice.name}
                    </div>
                    <DialogTitle className="text-2xl font-semibold text-slate-50">
                      {selectedSlice.name} distribution
                    </DialogTitle>
                    <DialogDescription className="max-w-2xl text-slate-400">
                      This view breaks down the positions inside the selected category so you can
                      see where the allocation is concentrated.
                    </DialogDescription>
                  </div>

                  <div className="grid gap-3 sm:grid-cols-3">
                    <div className="rounded-2xl border border-white/10 bg-white/5 px-4 py-3">
                      <div className="text-xs uppercase tracking-wide text-slate-400">
                        Current value
                      </div>
                      <div className="mt-1 text-lg font-semibold">
                        {formatCurrency(selectedSlice.value)}
                      </div>
                    </div>
                    <div className="rounded-2xl border border-white/10 bg-white/5 px-4 py-3">
                      <div className="text-xs uppercase tracking-wide text-slate-400">
                        Positions
                      </div>
                      <div className="mt-1 text-lg font-semibold">{selectedSlice.count}</div>
                    </div>
                    <div className="rounded-2xl border border-white/10 bg-white/5 px-4 py-3">
                      <div className="text-xs uppercase tracking-wide text-slate-400">
                        Monthly flow
                      </div>
                      <div className="mt-1 text-lg font-semibold">
                        {formatCurrency(selectedSlice.monthlyContribution)}
                      </div>
                    </div>
                  </div>
                </div>
              </DialogHeader>

              <div className="grid gap-0 lg:grid-cols-[0.95fr_1.05fr]">
                <div className="border-b border-white/10 p-6 lg:border-b-0 lg:border-r lg:p-8">
                  <div className="mb-4">
                    <div className="text-sm font-medium text-slate-200">Top positions by value</div>
                    <div className="text-xs text-slate-400">
                      Largest positions inside {selectedSlice.name}
                    </div>
                  </div>

                  {selectedSliceChartData.length > 0 ? (
                    <div className="h-[320px]">
                      <ResponsiveContainer width="100%" height="100%">
                        <BarChart
                          data={selectedSliceChartData}
                          layout="vertical"
                          margin={{ top: 8, right: 12, left: 8, bottom: 8 }}
                        >
                          <CartesianGrid horizontal={false} stroke="#1e293b" />
                          <XAxis
                            type="number"
                            tickFormatter={value => formatCompactCurrency(Number(value))}
                            tickLine={false}
                            axisLine={false}
                          />
                          <YAxis
                            type="category"
                            dataKey="name"
                            tickLine={false}
                            axisLine={false}
                            width={108}
                            tick={{ fill: '#cbd5e1', fontSize: 12 }}
                          />
                          <RechartsTooltip
                            formatter={(value: number) => formatCurrency(Number(value))}
                          />
                          <Bar dataKey="value" radius={[0, 10, 10, 0]}>
                            {selectedSliceChartData.map(item => (
                              <Cell key={item.id} fill={selectedSlice.color} />
                            ))}
                          </Bar>
                        </BarChart>
                      </ResponsiveContainer>
                    </div>
                  ) : (
                    <div className="rounded-3xl border border-dashed border-white/10 bg-white/5 p-6 text-sm text-slate-400">
                      No positions in this category yet.
                    </div>
                  )}
                </div>

                <div className="p-6 lg:p-8">
                  <div className="mb-4 flex items-center justify-between gap-3">
                    <div>
                      <div className="text-sm font-medium text-slate-200">Underlying positions</div>
                      <div className="text-xs text-slate-400">
                        Edit a position or add a contribution directly from here
                      </div>
                    </div>
                  </div>

                  <ScrollArea className="h-[360px] pr-4">
                    <div className="space-y-3">
                      {selectedSlice.items.map(item => {
                        const linkedAccount = item.accountId
                          ? (accountsById.get(item.accountId) ?? 'Linked account')
                          : 'Not linked';
                        const netContributions = contributionsByInvestment.get(item.id) ?? 0;

                        return (
                          <div
                            key={item.id}
                            className="rounded-3xl border border-white/10 bg-white/5 p-4"
                          >
                            <div className="flex flex-wrap items-start justify-between gap-4">
                              <div className="min-w-0 flex-1">
                                <div className="truncate text-base font-semibold text-slate-50">
                                  {item.name}
                                </div>
                                <div className="mt-1 text-sm text-slate-400">
                                  {[item.symbol, item.institution, linkedAccount]
                                    .filter(Boolean)
                                    .join(' • ')}
                                </div>
                              </div>

                              <div className="flex gap-2">
                                <Button
                                  size="sm"
                                  variant="outline"
                                  className="border-white/15 bg-transparent text-slate-100 hover:bg-white/10 hover:text-white"
                                  onClick={() => onEditInvestment(item)}
                                >
                                  Edit
                                </Button>
                                <Button
                                  size="sm"
                                  className="bg-white text-slate-950 hover:bg-slate-200"
                                  onClick={() => onAddContribution(item.id)}
                                >
                                  Add Contribution
                                </Button>
                              </div>
                            </div>

                            <div className="mt-4 grid gap-3 sm:grid-cols-3">
                              <div className="rounded-2xl bg-black/20 px-3 py-3">
                                <div className="text-xs uppercase tracking-wide text-slate-500">
                                  Current value
                                </div>
                                <div className="mt-1 text-sm font-semibold text-slate-100">
                                  {formatCurrency(Number(item.currentValue || 0), item.currency)}
                                </div>
                              </div>
                              <div className="rounded-2xl bg-black/20 px-3 py-3">
                                <div className="text-xs uppercase tracking-wide text-slate-500">
                                  Monthly contribution
                                </div>
                                <div className="mt-1 text-sm font-semibold text-slate-100">
                                  {formatCurrency(
                                    Number(item.monthlyContribution || 0),
                                    item.currency
                                  )}
                                </div>
                              </div>
                              <div className="rounded-2xl bg-black/20 px-3 py-3">
                                <div className="text-xs uppercase tracking-wide text-slate-500">
                                  Net contributions
                                </div>
                                <div className="mt-1 text-sm font-semibold text-slate-100">
                                  {formatCurrency(Number(netContributions), item.currency)}
                                </div>
                              </div>
                            </div>

                            {item.notes ? (
                              <div className="mt-3 text-sm text-slate-400">{item.notes}</div>
                            ) : null}
                          </div>
                        );
                      })}
                    </div>
                  </ScrollArea>
                </div>
              </div>
            </>
          ) : null}
        </DialogContent>
      </Dialog>
    </>
  );
}
