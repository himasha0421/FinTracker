import { useState } from 'react';
import { format } from 'date-fns';
import type { DateRange } from 'react-day-picker';
import { useQuery } from '@tanstack/react-query';
import { transactionsListQuery } from './api';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Input } from '@/components/ui/input';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Plus, Search, ArrowUpDown, CalendarIcon } from 'lucide-react';
import TransactionForm from '@/features/transactions/components/TransactionForm';
import type { TransactionWithAssignments } from '@/features/transactions/types';
import {
  iconOptions,
  resolveTransactionIconValue,
  type IconValue,
} from '@/features/transactions/constants';
import { cn } from '@/lib/utils';

const transactionIcons = iconOptions.reduce((acc, option) => {
  acc[option.value] = <option.Icon className="h-4 w-4 text-muted-foreground" />;
  return acc;
}, {} as Record<IconValue, JSX.Element>);

const currencyFormatter = new Intl.NumberFormat('en-US', {
  style: 'currency',
  currency: 'USD',
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});

type TransactionRowProps = {
  transaction: TransactionWithAssignments;
  onEdit: (transaction: TransactionWithAssignments) => void;
};

function formatDate(date: Date | string) {
  return new Date(date).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });
}

const normalizeDateValue = (date: Date | string) => {
  const normalized = new Date(date);
  normalized.setHours(0, 0, 0, 0);
  return normalized.getTime();
};

const TransactionRow = ({ transaction, onEdit }: TransactionRowProps) => {
  const iconKey = resolveTransactionIconValue(transaction);

  const formattedAmount = currencyFormatter.format(Number(transaction.amount));

  const isIncome = transaction.type === 'income';
  const amountClass = isIncome ? 'text-positive' : 'text-negative';
  const formattedPrefix = isIncome ? '+' : '-';

  return (
    <tr
      className="border-b border-border transition-colors hover:bg-accent/50 cursor-pointer"
      onClick={() => onEdit(transaction)}
    >
      <td className="p-3">
        <div className="flex items-center">
          <div className="w-8 h-8 rounded-md bg-background border border-border flex items-center justify-center mr-3">
            {transactionIcons[iconKey] || transactionIcons['shopping-bag']}
          </div>
          <div>
            <div className="font-medium"> {transaction.description} </div>
            <div className="text-xs text-muted-foreground">
              {' '}
              {transaction.category || 'Uncategorized'}{' '}
            </div>
          </div>
        </div>
      </td>
      <td className="p-3 text-muted-foreground"> {formatDate(transaction.date)} </td>
      <td className="p-3 text-muted-foreground">
        <div className="space-y-1">
          {transaction.assignments && transaction.assignments.length > 0 ? (
            transaction.assignments.map(assignment => {
              const sharePercent = Number(assignment.sharePercent) || 0;
              const shareAmount =
                (Number(transaction.amount) * sharePercent) / 100;
              return (
                <div key={`${assignment.id}-${assignment.assignee}`} className="flex items-center justify-between text-xs">
                  <span>{assignment.assignee}</span>
                  <span className="font-mono">
                    {sharePercent.toFixed(2)}% ({currencyFormatter.format(shareAmount)})
                  </span>
                </div>
              );
            })
          ) : (
            <span className="text-xs text-muted-foreground">Unassigned</span>
          )}
        </div>
      </td>
      <td className="p-3 text-right">
        <span className={`font-medium ${amountClass} font-mono`}>
          {isIncome ? formattedPrefix : ''}
          {formattedAmount}
        </span>
      </td>
    </tr>
  );
};

export default function TransactionsScreen() {
  const [isTransactionFormOpen, setIsTransactionFormOpen] = useState(false);
  const [editingTransaction, setEditingTransaction] = useState<TransactionWithAssignments | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterType, setFilterType] = useState('all');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');
  const [dateRange, setDateRange] = useState<DateRange | undefined>();

  const { data: transactions, isLoading } = useQuery({
    ...transactionsListQuery(),
    refetchOnMount: true,
    refetchOnWindowFocus: true,
    staleTime: 0,
  });

  const handleAddTransaction = () => {
    setEditingTransaction(null);
    setIsTransactionFormOpen(true);
  };

  const handleEditTransaction = (transaction: Transaction) => {
    setEditingTransaction(transaction);
    setIsTransactionFormOpen(true);
  };

  const filteredTransactions =
    transactions && Array.isArray(transactions)
      ? transactions
          .filter((transaction: TransactionWithAssignments) => {
            const searchValue = searchTerm.toLowerCase();
            const matchesSearch =
              transaction.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
              (transaction.category &&
                transaction.category.toLowerCase().includes(searchTerm.toLowerCase())) ||
              transaction.assignments.some(assignment =>
                assignment.assignee.toLowerCase().includes(searchValue)
              );

            const matchesType = filterType === 'all' || transaction.type === filterType;
            const matchesDateRange = (() => {
              if (!dateRange?.from && !dateRange?.to) {
                return true;
              }

              const transactionTime = normalizeDateValue(transaction.date);
              const fromTime = dateRange?.from ? normalizeDateValue(dateRange.from) : undefined;
              const toTime = dateRange?.to
                ? normalizeDateValue(dateRange.to)
                : fromTime;

              if (fromTime && toTime) {
                return transactionTime >= fromTime && transactionTime <= toTime;
              }

              return true;
            })();

            return matchesSearch && matchesType && matchesDateRange;
          })
          .sort((a: TransactionWithAssignments, b: TransactionWithAssignments) => {
            const dateA = new Date(a.date).getTime();
            const dateB = new Date(b.date).getTime();

            return sortOrder === 'desc' ? dateB - dateA : dateA - dateB;
          })
      : [];

  return (
    <>
      <div className="space-y-4">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <h1 className="text-2xl font-bold"> Transactions </h1>
          <Button onClick={handleAddTransaction}>
            <Plus className="mr-2 h-4 w-4" />
            Add Transaction
          </Button>
        </div>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle>Transaction History </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex flex-col md:flex-row gap-4 mb-6">
              <div className="relative flex-1">
                <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search transactions..."
                  className="pl-8"
                  value={searchTerm}
                  onChange={e => setSearchTerm(e.target.value)}
                />
              </div>

              <div className="flex flex-wrap gap-2 justify-end">
                <Popover>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      className={cn(
                        'w-[240px] justify-start text-left font-normal',
                        !dateRange?.from && 'text-muted-foreground'
                      )}
                    >
                      <CalendarIcon className="mr-2 h-4 w-4" />
                      {dateRange?.from ? (
                        dateRange.to ? (
                          `${format(dateRange.from, 'LLL dd, y')} - ${format(
                            dateRange.to,
                            'LLL dd, y'
                          )}`
                        ) : (
                          format(dateRange.from, 'LLL dd, y')
                        )
                      ) : (
                        'Filter by date'
                      )}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="end">
                    <Calendar
                      mode="range"
                      numberOfMonths={2}
                      selected={dateRange}
                      onSelect={range => setDateRange(range)}
                      defaultMonth={dateRange?.from}
                      initialFocus
                    />
                    {dateRange?.from && (
                      <div className="flex items-center justify-between border-t border-border px-3 py-2">
                        <span className="text-xs text-muted-foreground">
                          {dateRange.to ? 'Date range selected' : 'Single date selected'}
                        </span>
                        <Button variant="ghost" size="sm" onClick={() => setDateRange(undefined)}>
                          Clear
                        </Button>
                      </div>
                    )}
                  </PopoverContent>
                </Popover>

                <Select value={filterType} onValueChange={setFilterType}>
                  <SelectTrigger className="w-[150px]">
                    <SelectValue placeholder="Filter by type" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all"> All Types </SelectItem>
                    <SelectItem value="income"> Income </SelectItem>
                    <SelectItem value="expense"> Expense </SelectItem>
                  </SelectContent>
                </Select>

                <Button
                  variant="outline"
                  size="icon"
                  className="h-10 w-10"
                  onClick={() => setSortOrder(sortOrder === 'desc' ? 'asc' : 'desc')}
                >
                  <ArrowUpDown className="h-4 w-4" />
                </Button>
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-border">
                    <th className="p-3 text-left font-medium"> Description </th>
                    <th className="p-3 text-left font-medium"> Date </th>
                    <th className="p-3 text-left font-medium"> Split </th>
                    <th className="p-3 text-right font-medium"> Amount </th>
                  </tr>
                </thead>
                <tbody>
                  {isLoading ? (
                    Array.from({ length: 5 }).map((_, index) => (
                      <tr key={index} className="border-b border-border">
                        <td className="p-3">
                          <div className="flex items-center">
                            <Skeleton className="w-8 h-8 rounded-md mr-3" />
                            <div>
                              <Skeleton className="h-4 w-24 mb-1" />
                              <Skeleton className="h-3 w-16" />
                            </div>
                          </div>
                        </td>
                        <td className="p-3">
                          {' '}
                          <Skeleton className="h-4 w-24" />{' '}
                        </td>
                        <td className="p-3 text-muted-foreground">
                          <div className="space-y-2">
                            <Skeleton className="h-3 w-28" />
                            <Skeleton className="h-3 w-24" />
                          </div>
                        </td>
                        <td className="p-3 text-right">
                          {' '}
                          <Skeleton className="h-4 w-16 ml-auto" />{' '}
                        </td>
                      </tr>
                    ))
                  ) : filteredTransactions && filteredTransactions.length > 0 ? (
                    filteredTransactions.map((transaction: TransactionWithAssignments) => (
                      <TransactionRow
                        key={transaction.id}
                        transaction={transaction}
                        onEdit={handleEditTransaction}
                      />
                    ))
                  ) : (
                    <tr>
                      <td colSpan={4} className="p-6 text-center text-muted-foreground">
                        {searchTerm || filterType !== 'all' || dateRange?.from
                          ? 'No transactions match your filters.'
                          : 'No transactions found. Add a transaction to get started.'}
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      </div>

      <TransactionForm
        isOpen={isTransactionFormOpen}
        onClose={() => {
          setIsTransactionFormOpen(false);
          setEditingTransaction(null);
        }}
        transaction={editingTransaction}
      />
    </>
  );
}
