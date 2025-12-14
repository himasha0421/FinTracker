import { useQuery } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import {
  ChevronRight,
  Plus,
  ShoppingBag,
  Briefcase,
  Film,
  Database,
  Server,
  ShoppingCart,
} from 'lucide-react';
import { Link } from 'wouter';
import type { Transaction } from '@shared/schema';
import { useState } from 'react';
import TransactionForm from '@/features/transactions/components/TransactionForm';
import { transactionsListQuery } from '@/features/transactions/api';

// Map of transaction icons
const transactionIcons: Record<string, JSX.Element> = {
  'shopping-bag': <ShoppingBag className="h-4 w-4 text-muted-foreground" />,
  briefcase: <Briefcase className="h-4 w-4 text-muted-foreground" />,
  film: <Film className="h-4 w-4 text-muted-foreground" />,
  database: <Database className="h-4 w-4 text-muted-foreground" />,
  server: <Server className="h-4 w-4 text-muted-foreground" />,
  'shopping-cart': <ShoppingCart className="h-4 w-4 text-muted-foreground" />,
};

type TransactionItemProps = {
  transaction: Transaction;
};

function formatDate(date: Date | string) {
  const txDate = typeof date === 'string' ? new Date(date) : date;
  const now = new Date();

  const isToday = txDate.toDateString() === now.toDateString();
  const isYesterday =
    new Date(now.setDate(now.getDate() - 1)).toDateString() === txDate.toDateString();

  if (isToday) {
    return 'Today';
  } else if (isYesterday) {
    return 'Yesterday';
  } else {
    return txDate.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  }
}

const TransactionItem = ({ transaction }: TransactionItemProps) => {
  const formattedAmount = new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(Number(transaction.amount));

  const isIncome = transaction.type === 'income';
  const amountClass = isIncome ? 'text-positive' : 'text-negative';
  const formattedPrefix = isIncome ? '+' : '-';

  return (
    <div className="flex items-center justify-between py-2">
      <div className="flex items-center">
        <div className="w-8 h-8 rounded-md bg-surfaceDark border border-border flex items-center justify-center mr-3">
          {(transaction.icon && transactionIcons[transaction.icon]) || (
            <div className="h-4 w-4 text-muted-foreground" />
          )}
        </div>
        <div>
          <h3 className="font-medium"> {transaction.description} </h3>
          <p className="text-xs text-muted-foreground"> {formatDate(transaction.date)} </p>
        </div>
      </div>
      <div className="text-right">
        <span className={`font-medium ${amountClass} font-mono`}>
          {isIncome ? formattedPrefix : ''}
          {formattedAmount}
        </span>
      </div>
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

  const handleAddTransaction = () => {
    setIsTransactionFormOpen(true);
  };

  return (
    <>
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle>Recent Activity </CardTitle>
          <div className="flex items-center gap-2">
            <div className="text-sm text-muted-foreground">
              {!isLoading && transactions ? `${transactions.length} transactions` : '...'}
            </div>
            <Button size="sm" variant="ghost" onClick={handleAddTransaction}>
              <Plus className="mr-1 h-4 w-4" />
              Add
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <div className="space-y-4 max-h-[420px] overflow-y-auto">
            {isLoading ? (
              Array.from({ length: 5 }).map((_, index) => (
                <div key={index} className="flex items-center justify-between py-2">
                  <div className="flex items-center">
                    <Skeleton className="w-8 h-8 rounded-md mr-3" />
                    <div>
                      <Skeleton className="h-4 w-24 mb-1" />
                      <Skeleton className="h-3 w-16" />
                    </div>
                  </div>
                  <Skeleton className="h-4 w-16" />
                </div>
              ))
            ) : transactions && transactions.length > 0 ? (
              transactions.map((transaction: Transaction) => (
                <TransactionItem key={transaction.id} transaction={transaction} />
              ))
            ) : (
              <div className="py-3 text-center text-muted-foreground">No transactions found.</div>
            )}
          </div>
        </CardContent>
        <CardFooter>
          <Button className="w-full" variant="outline" asChild>
            <Link href="/transactions">
              <div className="flex items-center justify-center w-full">
                <span>View All Transactions </span>
                <ChevronRight className="ml-1 h-4 w-4" />
              </div>
            </Link>
          </Button>
        </CardFooter>
      </Card>

      <TransactionForm
        isOpen={isTransactionFormOpen}
        onClose={() => setIsTransactionFormOpen(false)}
      />
    </>
  );
}
