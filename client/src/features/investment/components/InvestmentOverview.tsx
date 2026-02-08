import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
} from 'recharts';
import { PieChart as PieChartIcon, TrendingDown, TrendingUp } from 'lucide-react';
import { formatCurrency } from '@/features/investment/utils';

type AllocationItem = {
  name: string;
  value: number;
  color: string;
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
}: InvestmentOverviewProps) {
  return (
    <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2">
            <TrendingUp className="h-5 w-5 text-emerald-400" />
            Portfolio Summary
          </CardTitle>
          <CardDescription>Totals assume a single currency</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {isLoading ? (
            <Skeleton className="h-10 w-32" />
          ) : (
            <div className="text-3xl font-bold">{formatCurrency(totalInvestmentValue)}</div>
          )}
          <div className="space-y-2 text-sm">
            <div className="flex items-center justify-between">
              <span>Monthly contributions</span>
              <span className="font-medium">{formatCurrency(totalMonthlyContribution)}</span>
            </div>
            <div className="flex items-center justify-between text-xs text-muted-foreground">
              <span>Assets (land, cars)</span>
              <span>{formatCurrency(monthlyContributionAssets)}</span>
            </div>
            <div className="flex items-center justify-between text-xs text-muted-foreground">
              <span>Holdings (investments, fixed deposits)</span>
              <span>{formatCurrency(monthlyContributionHoldings)}</span>
            </div>
            <div className="flex items-center justify-between">
              <span>Current balance</span>
              <span className="font-medium">{formatCurrency(totalInvestmentValue)}</span>
            </div>
            <div className="flex items-center justify-between text-xs text-muted-foreground">
              <span>Assets (land, cars)</span>
              <span>{formatCurrency(currentBalanceAssets)}</span>
            </div>
            <div className="flex items-center justify-between text-xs text-muted-foreground">
              <span>Holdings (investments, fixed deposits)</span>
              <span>{formatCurrency(currentBalanceHoldings)}</span>
            </div>
            <div className="flex items-center justify-between">
              <span>Difference vs net contributions</span>
              <span
                className={`flex items-center gap-1 font-medium ${
                  gainLoss >= 0 ? 'text-emerald-400' : 'text-red-400'
                }`}
              >
                {gainLoss >= 0 ? (
                  <TrendingUp className="h-4 w-4" />
                ) : (
                  <TrendingDown className="h-4 w-4" />
                )}
                {formatCurrency(gainLoss)}
                {gainLossPercent ? <span>({gainLossPercent}%)</span> : null}
              </span>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2">
            <PieChartIcon className="h-5 w-5 text-blue-400" />
            Allocation by Type
          </CardTitle>
          <CardDescription>Current value split</CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <Skeleton className="h-[200px]" />
          ) : allocationData.length > 0 ? (
            <div className="h-[200px]">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={allocationData}
                    cx="50%"
                    cy="50%"
                    labelLine={false}
                    outerRadius={80}
                    dataKey="value"
                  >
                    {allocationData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip formatter={(value: number) => formatCurrency(Number(value))} />
                </PieChart>
              </ResponsiveContainer>
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">No allocation data yet.</p>
          )}
          <div className="grid grid-cols-2 gap-3 mt-4">
            {allocationData.map(item => (
              <div key={item.name} className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span
                    className="inline-block h-2 w-2 rounded-full"
                    style={{ background: item.color }}
                  />
                  <span className="text-sm text-muted-foreground">{item.name}</span>
                </div>
                <span className="text-sm font-medium">
                  {totalAllocationValue > 0
                    ? `${Math.round((item.value / totalAllocationValue) * 100)}%`
                    : '0%'}
                </span>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2">
            <TrendingUp className="h-5 w-5 text-indigo-400" />
            Contribution Trend
          </CardTitle>
          <CardDescription>Last 12 months net contributions</CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <Skeleton className="h-[180px]" />
          ) : (
            <div className="h-[180px]">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={contributionSeries}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="month" />
                  <YAxis />
                  <Tooltip formatter={(value: number) => formatCurrency(Number(value))} />
                  <Line
                    type="monotone"
                    dataKey="value"
                    stroke="#6366f1"
                    strokeWidth={2}
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
