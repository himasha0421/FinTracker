import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { HoverCard, HoverCardContent, HoverCardTrigger } from '@/components/ui/hover-card';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Skeleton } from '@/components/ui/skeleton';
import type { TransactionWithAssignments } from '@/features/transactions/types';
import { ResponsiveContainer, PieChart, Pie, Cell, Tooltip, Legend } from 'recharts';

const PIE_COLORS = ['#2563eb', '#f97316', '#22c55e', '#a855f7', '#ef4444', '#14b8a6'];
const formatCurrency = (value: number) => `$${value.toFixed(2)}`;

type AssigneeDistributionCardProps = {
  isLoading: boolean;
  distribution: { name: string; value: number }[];
  categoriesByAssignee: Record<string, { name: string; value: number }[]>;
  categoryTransactions: Record<
    string,
    Record<
      string,
      { transaction: TransactionWithAssignments; shareAmount: number; sharePercent: number }[]
    >
  >;
  total: number;
};

export default function AssigneeDistributionCard({
  isLoading,
  distribution,
  categoriesByAssignee,
  categoryTransactions,
  total,
}: AssigneeDistributionCardProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Expense Distribution by Assignee</CardTitle>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <Skeleton className="h-64 w-full" />
        ) : distribution.length === 0 ? (
          <p className="text-sm text-muted-foreground">No expense data for this range.</p>
        ) : (
          <div className="grid gap-6 lg:grid-cols-2">
            <div className="flex h-64 items-center justify-center">
              <div className="h-full w-full max-w-[360px]">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={distribution}
                      dataKey="value"
                      nameKey="name"
                      cx="50%"
                      cy="50%"
                      outerRadius={110}
                      labelLine={false}
                    >
                      {distribution.map((entry, index) => (
                        <Cell key={entry.name} fill={PIE_COLORS[index % PIE_COLORS.length]} />
                      ))}
                    </Pie>
                  <Tooltip formatter={value => `$${Number(value).toFixed(2)}`} />
                  <Legend />
                </PieChart>
                </ResponsiveContainer>
              </div>
            </div>
            <div className="space-y-4">
              <div className="grid gap-3 sm:grid-cols-2">
                {distribution.map((entry, index) => {
                  const categories = categoriesByAssignee[entry.name] || [];
                  return (
                    <div key={entry.name} className="rounded-md border px-4 py-3 space-y-3">
                      <div className="flex items-center justify-between gap-3">
                        <div>
                          <p className="text-base font-semibold">{entry.name}</p>
                          <p className="text-sm text-muted-foreground">
                            {total > 0 ? ((entry.value / total) * 100).toFixed(1) : '0.0'}% of expenses
                          </p>
                        </div>
                        <div className="text-right">
                          <p className="text-lg font-bold">{formatCurrency(entry.value)}</p>
                          <span
                            className="ml-auto inline-flex h-3 w-3 rounded-full"
                            style={{ backgroundColor: PIE_COLORS[index % PIE_COLORS.length] }}
                          />
                        </div>
                      </div>
                      <div className="space-y-2">
                        {categories.length > 0 ? (
                          categories.map(category => (
                            <HoverCard key={`${entry.name}-${category.name}`} openDelay={0} closeDelay={0}>
                              <HoverCardTrigger asChild>
                                <div className="flex cursor-pointer items-center justify-between rounded-md border px-3 py-2 transition-colors hover:bg-accent/60">
                                  <div>
                                    <p className="text-sm font-medium">{category.name}</p>
                                    <p className="text-xs text-muted-foreground">
                                      {entry.value > 0
                                        ? ((category.value / entry.value) * 100).toFixed(1)
                                        : '0.0'}
                                      % of assignee
                                    </p>
                                  </div>
                                  <p className="text-sm font-semibold">{formatCurrency(category.value)}</p>
                                </div>
                              </HoverCardTrigger>
                              <HoverCardContent className="w-[420px] p-4" align="start">
                                <CategoryTransactionsPopover
                                  assignee={entry.name}
                                  category={category.name}
                                  transactions={
                                    categoryTransactions[entry.name]?.[category.name] || []
                                  }
                                />
                              </HoverCardContent>
                            </HoverCard>
                          ))
                        ) : (
                          <span className="text-sm text-muted-foreground">No categorized expenses</span>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
              <div className="flex items-center justify-between rounded-lg border bg-muted/30 px-4 py-3 text-base font-semibold">
                <span>Grand total</span>
                <span>{formatCurrency(total)}</span>
              </div>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

type CategoryTransactionsPopoverProps = {
  assignee: string;
  category: string;
  transactions: {
    transaction: TransactionWithAssignments;
    shareAmount: number;
    sharePercent: number;
  }[];
};

function CategoryTransactionsPopover({
  assignee,
  category,
  transactions,
}: CategoryTransactionsPopoverProps) {
  const totalShare = transactions.reduce((sum, item) => sum + item.shareAmount, 0);

  return (
    <div className="w-full max-w-[380px] space-y-3">
      <div className="space-y-1">
        <p className="text-base font-semibold">
          {category} • {assignee}
        </p>
        <p className="text-sm text-muted-foreground">
          {transactions.length} transaction{transactions.length === 1 ? '' : 's'}
        </p>
        <p className="text-sm font-semibold">Total: {formatCurrency(totalShare)}</p>
      </div>
      <ScrollArea className="h-[260px] pr-2">
        {transactions.length > 0 ? (
          <div className="space-y-3">
            {transactions.map(({ transaction, shareAmount, sharePercent }, index) => (
              <div key={`${transaction.id}-${index}`} className="space-y-2 rounded-lg border p-3">
                <div className="flex items-center justify-between gap-4">
                  <p className="text-base font-medium leading-tight">
                    {transaction.description || 'Untitled Transaction'}
                  </p>
                  <p className="text-base font-semibold">{formatCurrency(shareAmount)}</p>
                </div>
                <div className="flex items-center justify-between text-xs text-muted-foreground">
                  <span>{new Date(transaction.date).toLocaleDateString()}</span>
                  <span>{sharePercent.toFixed(1)}% share</span>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-sm text-muted-foreground">No transactions recorded.</p>
        )}
      </ScrollArea>
    </div>
  );
}
