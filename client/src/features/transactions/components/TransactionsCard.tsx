import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { ChevronRight, Plus } from 'lucide-react';
import { Link } from 'wouter';
import { SectionCard, SectionCardHeader, SectionCardContent } from '@/components/composed/SectionCard';
import { SkeletonListItem } from '@/components/composed/SkeletonListItem';
import { EmptyState } from '@/components/composed/EmptyState';
import type { TransactionWithAssignments } from '@/features/transactions/types';
import TransactionForm from '@/features/transactions/components/TransactionForm';
import { transactionsListQuery } from '@/features/transactions/api';
import { iconOptions, resolveTransactionIconValue, type IconValue } from '@/features/transactions/constants';
import { transactionColours } from '@/design/tokens';
import { formatCurrency } from '@/lib/formatters';

const transactionIcons = iconOptions.reduce((acc, option) => {
  acc[option.value] = <option.Icon className="h-4 w-4 text-muted-foreground" />;
  return acc;
}, {} as Record<IconValue, JSX.Element>);

function normaliseDate(date: Date | string): Date {
  if (typeof date !== 'string') return date;
  return new Date(date.includes('T') ? date : `${date}T00:00:00`);
}

function formatDate(date: Date | string) {
  const txDate = normaliseDate(date);
  const now = new Date();
  const isToday = txDate.toDateString() === now.toDateString();
  const isYesterday = new Date(now.setDate(now.getDate() - 1)).toDateString() === txDate.toDateString();
  if (isToday) return 'Today';
  if (isYesterday) return 'Yesterday';
  return txDate.toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' });
}

const TransactionItem = ({ transaction }: { transaction: TransactionWithAssignments }) => {
  const iconKey = resolveTransactionIconValue(transaction);
  const splitSummary =
    transaction.assignments?.length
      ? transaction.assignments.map(a => `${a.assignee} ${(Number(a.sharePercent) || 0).toFixed(0)}%`).join(' • ')
      : 'Unassigned';

  const isIncome = transaction.type === 'income';
  const amountClass = isIncome ? transactionColours.income : transactionColours.expense;
  const prefix = isIncome ? '+' : '-';

  return (
    <div className="flex items-center justify-between py-2">
      <div className="flex items-center">
        <div className="mr-3 flex h-8 w-8 items-center justify-center rounded-md border border-border bg-surfaceDark">
          {transactionIcons[iconKey] || transactionIcons['shopping-bag']}
        </div>
        <div>
          <h3 className="font-medium">{transaction.description}</h3>
          <p className="text-xs text-muted-foreground">{formatDate(transaction.date)} · {splitSummary}</p>
        </div>
      </div>
      <span className={`font-mono font-medium ${amountClass}`}>
        {prefix}{formatCurrency(Number(transaction.amount))}
      </span>
    </div>
  );
};

export default function TransactionsCard() {
  const [isTransactionFormOpen, setIsTransactionFormOpen] = useState(false);

  const { data: transactions, isLoading } = useQuery({
    ...transactionsListQuery(6),
    refetchOnMount: true,
    refetchOnWindowFocus: true,
    staleTime: 0,
  });

  const countLabel = !isLoading && transactions ? `${transactions.length} transactions` : '';

  return (
    <>
      <SectionCard>
        <SectionCardHeader
          title="Recent Activity"
          action={
            <>
              {countLabel && <span className="text-sm text-muted-foreground">{countLabel}</span>}
              <Button size="sm" variant="ghost" onClick={() => setIsTransactionFormOpen(true)}>
                <Plus className="mr-1 h-4 w-4" />
                Add
              </Button>
            </>
          }
        />
        <SectionCardContent className="p-5">
          <div className="max-h-[420px] space-y-2 overflow-y-auto">
            {isLoading && Array.from({ length: 5 }, (_, i) => <SkeletonListItem key={`skel-${i}`} />)}
            {!isLoading && (!transactions || transactions.length === 0) && (
              <EmptyState text="No transactions found." />
            )}
            {!isLoading && transactions && transactions.length > 0 && transactions.map((tx: TransactionWithAssignments) => (
              <TransactionItem key={tx.id} transaction={tx} />
            ))}
          </div>
        </SectionCardContent>
        <div className="px-5 pb-5">
          <Button className="w-full" variant="outline" asChild>
            <Link href="/transactions">
              <span>View All Transactions</span>
              <ChevronRight className="ml-1 h-4 w-4" />
            </Link>
          </Button>
        </div>
      </SectionCard>

      <TransactionForm isOpen={isTransactionFormOpen} onClose={() => setIsTransactionFormOpen(false)} />
    </>
  );
}
