import { useMemo, useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Button } from '@/components/ui/button';
import {
  Bar,
  BarChart,
  Legend,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { ChevronDown } from 'lucide-react';
import { chartPaletteAlt } from '@/design/tokens';

type MonthlyCategorySpendCardProps = {
  monthlyData: Record<string, any>[];
  categories: string[];
  isLoading: boolean;
  budgetMap: Record<string, number>;
  monthlyTotalsByCategory: Record<string, number>;
  subcategoryTotalsByCategory: Record<string, Record<string, number>>;
};

const currencyFormatter = new Intl.NumberFormat('en-US', {
  style: 'currency',
  currency: 'USD',
  maximumFractionDigits: 0,
});

export default function MonthlyCategorySpendCard({
  monthlyData,
  categories,
  isLoading,
  budgetMap,
  monthlyTotalsByCategory,
  subcategoryTotalsByCategory,
}: MonthlyCategorySpendCardProps) {
  const [expandedCategory, setExpandedCategory] = useState<string | null>(null);
  const rows = useMemo(() => {
    return categories
      .map(category => {
        const budget = budgetMap[category] || 0;
        const total = Number(monthlyTotalsByCategory[category] || 0);
        const percentUsed = budget > 0 ? (total / budget) * 100 : 0;
        const monthlyAllocation = budget > 0 ? budget / 12 : 0;
        return {
          category,
          total,
          budget,
          variance: budget - total,
          percentUsed,
          monthlyAllocation,
        };
      })
      .sort((a, b) => b.total - a.total);
  }, [categories, budgetMap, monthlyTotalsByCategory]);

  return (
    <Card>
      <CardHeader>
        <CardTitle>Monthly Category Spend</CardTitle>
        <CardDescription>Track how each category trends month over month.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {isLoading ? (
          <Skeleton className="h-[260px]" />
        ) : (
          <div className="h-[260px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={monthlyData} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                <XAxis dataKey="month" />
                <YAxis />
                <Tooltip
                  content={({ active, payload, label }) => {
                    if (!active || !payload || payload.length === 0) return null;
                    return (
                      <div className="rounded-md border bg-popover p-3 text-sm shadow-sm">
                        <p className="mb-2 text-xs font-medium text-muted-foreground">{label}</p>
                        <div className="space-y-1">
                          {payload.map(entry => (
                            <div key={entry.name} className="flex items-center justify-between gap-3">
                              <span className="flex items-center gap-2">
                                <span
                                  className="inline-block h-2 w-2 rounded-full"
                                  style={{ background: entry.color }}
                                />
                                {entry.name}
                              </span>
                              <span className="font-mono text-foreground">
                                {currencyFormatter.format(Number(entry.value || 0))}
                              </span>
                            </div>
                          ))}
                        </div>
                      </div>
                    );
                  }}
                  cursor={{ fill: 'transparent' }}
                />
                <Legend />
                {categories.map((category, index) => (
                  <Bar
                    key={category}
                    dataKey={category}
                    stackId="a"
                    fill={chartPaletteAlt[index % chartPaletteAlt.length]}
                    radius={[4, 4, 0, 0]}
                  />
                ))}
              </BarChart>
            </ResponsiveContainer>
          </div>
        )}

        {rows.length === 0 ? (
          <p className="text-sm text-muted-foreground">Add expense categories to see monthly trends.</p>
        ) : (
          <div className="grid gap-3">
            {rows.map(row => {
              const subcategoryTotals = subcategoryTotalsByCategory[row.category] ?? {};
              const subcategoryRows = Object.entries(subcategoryTotals)
                .map(([name, total]) => ({
                  name,
                  total,
                  percent: row.total > 0 ? (total / row.total) * 100 : 0,
                }))
                .sort((a, b) => b.total - a.total);
              const isExpanded = expandedCategory === row.category;

              return (
                <div key={row.category} className="rounded-lg border">
                  <div className="flex flex-wrap items-center justify-between gap-4 p-4">
                    <div className="flex items-start gap-2">
                      <div>
                        <p className="text-sm font-semibold">{row.category}</p>
                        <p className="text-xs text-muted-foreground">
                          Total in range: {currencyFormatter.format(row.total)}
                        </p>
                      </div>
                      {subcategoryRows.length > 0 && (
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          className="mt-0.5 h-7 w-7"
                          aria-label={`Toggle ${row.category} subcategories`}
                          aria-expanded={isExpanded}
                          onClick={() =>
                            setExpandedCategory(isExpanded ? null : row.category)
                          }
                        >
                          <ChevronDown
                            className={`h-4 w-4 transition-transform ${
                              isExpanded ? 'rotate-180' : ''
                            }`}
                          />
                        </Button>
                      )}
                    </div>
                    <div className="grid min-w-[220px] grid-cols-2 gap-3 text-right md:min-w-[320px] md:grid-cols-3">
                      <div>
                        <p className="text-sm font-semibold">
                          {currencyFormatter.format(row.monthlyAllocation)}
                        </p>
                        <p className="text-xs text-muted-foreground">Monthly allocation</p>
                      </div>
                      <div>
                        <p className="text-sm font-semibold">{row.percentUsed.toFixed(1)}%</p>
                        <p className="text-xs text-muted-foreground">Budget used</p>
                      </div>
                      <div>
                        <p className="text-sm font-semibold">{currencyFormatter.format(row.budget)}</p>
                        <p className="text-xs text-muted-foreground">Yearly limit</p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p
                        className={`text-sm font-semibold ${
                          row.variance >= 0 ? 'text-emerald-600' : 'text-rose-600'
                        }`}
                      >
                        {row.variance >= 0
                          ? `${currencyFormatter.format(row.variance)} under`
                          : `${currencyFormatter.format(Math.abs(row.variance))} over`}
                      </p>
                      <p className="text-xs text-muted-foreground">Variance</p>
                    </div>
                  </div>
                  {subcategoryRows.length > 0 && isExpanded && (
                    <div className="border-t px-4 py-3">
                      <div className="grid gap-2">
                        {subcategoryRows.map(subcategory => (
                          <div
                            key={subcategory.name}
                            className="flex items-center justify-between text-sm"
                          >
                            <span className="text-muted-foreground">{subcategory.name}</span>
                            <span className="font-mono">
                              {currencyFormatter.format(subcategory.total)} •{' '}
                              {subcategory.percent.toFixed(1)}%
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
