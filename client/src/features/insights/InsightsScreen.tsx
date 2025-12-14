import { useQuery } from '@tanstack/react-query';
import { useState, useRef, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  BarChart,
  Bar,
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from 'recharts';
import type { Transaction } from '@shared/schema';
import {
  HoverCard,
  HoverCardContent,
  HoverCardTrigger,
} from '@/components/ui/hover-card';
import { ScrollArea } from '@/components/ui/scroll-area';
import { transactionsListQuery } from '@/features/transactions/api';

const getMonthOptions = () => {
  const options = [];
  const today = new Date();
  for (let i = 0; i < 12; i++) {
    const date = new Date(today.getFullYear(), today.getMonth() - i, 1);
    const monthYear = date.toLocaleString('default', { month: 'long', year: 'numeric' });
    const value = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
    options.push({ label: monthYear, value });
  }
  return options;
};

const getWeeksInMonth = (transactions: Transaction[], monthYear: string) => {
  const [year, month] = monthYear.split('-').map(Number);
  const startDate = new Date(year, month - 1, 1);
  const endDate = new Date(year, month, 0);

  const weeks: { start: Date; end: Date }[] = [];
  let currentWeekStart = new Date(startDate);

  while (currentWeekStart <= endDate) {
    const weekEnd = new Date(currentWeekStart);
    weekEnd.setDate(weekEnd.getDate() + 6);
    
    const adjustedEnd = new Date(Math.min(weekEnd.getTime(), endDate.getTime()));
    
    weeks.push({
      start: new Date(currentWeekStart),
      end: adjustedEnd
    });
    
    currentWeekStart.setDate(currentWeekStart.getDate() + 7);
  }

  return weeks;
};

type WeekTransactionProps = {
  weekTransactions: Transaction[];
  week: string;
};

const WeekTransactions = ({ weekTransactions, week }: WeekTransactionProps) => {
  return (
    <div className="w-[300px]">
      <div className="flex items-center justify-between mb-4">
        <h4 className="text-sm font-semibold">{week} Transactions</h4>
      </div>
      <ScrollArea className="h-[200px]">
        <div className="space-y-4">
          {weekTransactions.map((transaction, i) => (
            <div
              key={i}
              className="flex items-start space-x-4 rounded-md border p-3 hover:bg-accent transition-colors"
            >
              <div className="space-y-1">
                <p className="text-sm font-medium leading-none">
                  {transaction.description || 'Untitled Transaction'}
                </p>
                <p className="text-sm text-muted-foreground">
                  {new Date(transaction.date).toLocaleDateString()}
                </p>
                <p className={`text-sm font-semibold ${
                  transaction.type === 'income' ? 'text-success' : 'text-destructive'
                }`}>
                  ${Number(transaction.amount).toFixed(2)}
                </p>
                {transaction.category && (
                  <p className="text-xs text-muted-foreground">
                    Category: {transaction.category}
                  </p>
                )}
              </div>
            </div>
          ))}
        </div>
      </ScrollArea>
    </div>
  );
};

export default function InsightsScreen() {
  const [selectedMonth, setSelectedMonth] = useState(() => {
    const today = new Date();
    return `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}`;
  });

  const { data: transactions, isLoading } = useQuery({
    ...transactionsListQuery(),
    staleTime: 30000,
    refetchOnMount: true,
    refetchOnWindowFocus: true,
  });

  const filterTransactionsForMonth = (transactions: Transaction[] | undefined) => {
    if (!transactions) return [];
    const [year, month] = selectedMonth.split('-').map(Number);
    return transactions.filter(t => {
      const date = new Date(t.date);
      return date.getFullYear() === year && date.getMonth() === month - 1;
    });
  };

  const prepareMonthlyData = (transactions: Transaction[] | undefined) => {
    const filtered = filterTransactionsForMonth(transactions);
    const data = {
      name: 'Monthly Overview',
      income: 0,
      expense: 0,
      savings: 0,
    };

    filtered.forEach(transaction => {
      const amount = Number(transaction.amount);
      if (transaction.type === 'income') {
        data.income += amount;
      } else {
        data.expense += amount;
      }
    });

    data.savings = data.income - data.expense;
    return [data];
  };

  const prepareWeeklyExpenseData = (transactions: Transaction[] | undefined) => {
    const filtered = filterTransactionsForMonth(transactions);
    const weeks = getWeeksInMonth(filtered, selectedMonth);

    const uniqueCategories = new Set<string>();
    filtered.forEach(t => {
      if (t.type === 'expense' && t.category) {
        uniqueCategories.add(t.category);
      }
    });

    const weeklyData = weeks.map((week, index) => {
      const weekTransactions = filtered.filter(t => {
        const date = new Date(t.date);
        date.setHours(0, 0, 0, 0);
        
        const startDate = new Date(week.start);
        startDate.setHours(0, 0, 0, 0);
        
        const endDate = new Date(week.end);
        endDate.setHours(23, 59, 59, 999);
        
        return date >= startDate && date <= endDate;
      });

      const result: Record<string, any> = {
        week: `Week ${index + 1}`,
        _hasTransactions: weekTransactions.length > 0,
      };
      
      if (weekTransactions.length === 0) {
        Array.from(uniqueCategories).forEach(category => {
          result[category] = null;
        });
      } else {
        Array.from(uniqueCategories).forEach(category => {
          result[category] = 0;
        });

        weekTransactions.forEach(t => {
          if (t.type === 'expense' && t.category) {
            result[t.category] = (result[t.category] || 0) + Number(t.amount);
          }
        });
      }

      return result;
    });

    return weeklyData;
  };

  const monthlyData = prepareMonthlyData(transactions);
  const weeklyData = prepareWeeklyExpenseData(transactions);
  const monthOptions = getMonthOptions();

  const categories = Array.from(
    new Set(
      weeklyData.flatMap(week => 
        Object.keys(week).filter(key => 
          key !== 'week' && !key.startsWith('_')
        )
      )
    )
  );

  const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884d8', '#82ca9d'];

  const [selectedWeek, setSelectedWeek] = useState<number | null>(null);
  const tooltipRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (tooltipRef.current && !tooltipRef.current.contains(event.target as Node)) {
        setSelectedWeek(null);
      }
    }

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold">Spending Insights</h1>
          <p className="text-muted-foreground">
            Track your income, expenses, and savings with month-over-month breakdowns.
          </p>
        </div>
        <Select value={selectedMonth} onValueChange={setSelectedMonth}>
          <SelectTrigger className="w-[220px]">
            <SelectValue placeholder="Select month" />
          </SelectTrigger>
          <SelectContent>
            {getMonthOptions().map(option => (
              <SelectItem key={option.value} value={option.value}>
                {option.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {isLoading ? (
        <div className="grid gap-4 md:grid-cols-2">
          <Card>
            <CardContent className="p-6">
              <Skeleton className="h-6 w-40 mb-4" />
              <Skeleton className="h-[300px]" />
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-6">
              <Skeleton className="h-6 w-40 mb-4" />
              <Skeleton className="h-[300px]" />
            </CardContent>
          </Card>
        </div>
      ) : (
        <div className="grid gap-4 md:grid-cols-2">
          <Card className="col-span-1">
            <CardHeader>
              <CardTitle>Monthly Overview</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="h-[320px]">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={monthlyData}>
                    <XAxis dataKey="name" />
                    <YAxis />
                    <Tooltip />
                    <Legend />
                    <Bar dataKey="income" fill="#22c55e" name="Income" />
                    <Bar dataKey="expense" fill="#ef4444" name="Expenses" />
                    <Bar dataKey="savings" fill="#3b82f6" name="Savings" />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>

          <Card className="col-span-1">
            <CardHeader>
              <CardTitle>Weekly Spend by Category</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="h-[320px]">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={weeklyData}>
                    <XAxis dataKey="week" />
                    <YAxis />
                    <Tooltip
                      content={({ active, payload }) => {
                        if (!active || !payload || !payload.length) {
                          return null;
                        }

                        const weekIndex = payload[0].payload.week.split(' ')[1] - 1;
                        setSelectedWeek(weekIndex);

                        return (
                          <div ref={tooltipRef} className="rounded-md border bg-popover p-3 shadow-sm">
                            <p className="text-sm font-medium mb-2">{payload[0].payload.week}</p>
                            <div className="space-y-1">
                              {payload.map(entry => (
                                <div
                                  key={entry.name}
                                  className="flex items-center justify-between text-sm"
                                >
                                  <span className="flex items-center gap-2">
                                    <span
                                      className="inline-block h-2 w-2 rounded-full"
                                      style={{ background: entry.color }}
                                    />
                                    {entry.name}
                                  </span>
                                  <span className="font-mono">
                                    ${Number(entry.value).toFixed(2)}
                                  </span>
                                </div>
                              ))}
                            </div>
                          </div>
                        );
                      }}
                    />
                    <Legend />
                    {categories.map((category, index) => (
                      <Line
                        key={category}
                        type="monotone"
                        dataKey={category}
                        stroke={COLORS[index % COLORS.length]}
                        strokeWidth={2}
                        dot={false}
                        connectNulls
                      />
                    ))}
                  </LineChart>
                </ResponsiveContainer>
              </div>

              {selectedWeek !== null && weeklyData[selectedWeek] && (
                <div className="mt-4">
                  <HoverCard openDelay={0} closeDelay={0}>
                    <HoverCardTrigger>
                      <div className="text-sm text-muted-foreground">
                        Hover over chart points to see weekly transactions
                      </div>
                    </HoverCardTrigger>
                    <HoverCardContent className="w-auto p-0">
                      <WeekTransactions
                        weekTransactions={filterTransactionsForMonth(transactions).filter(t => {
                          const date = new Date(t.date);
                          const weeks = getWeeksInMonth(
                            filterTransactionsForMonth(transactions),
                            selectedMonth
                          );
                          const week = weeks[selectedWeek];
                          return date >= week.start && date <= week.end;
                        })}
                        week={`Week ${selectedWeek + 1}`}
                      />
                    </HoverCardContent>
                  </HoverCard>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}
