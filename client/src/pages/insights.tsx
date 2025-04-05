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
} from "@/components/ui/hover-card";
import { ScrollArea } from "@/components/ui/scroll-area";

// Helper function to get month options
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

// Helper function to get weeks in a month
const getWeeksInMonth = (transactions: Transaction[], monthYear: string) => {
  const [year, month] = monthYear.split('-').map(Number);
  const startDate = new Date(year, month - 1, 1);
  const endDate = new Date(year, month, 0);

  // Log to debug
  console.log(`Month range: ${startDate.toISOString()} to ${endDate.toISOString()}`);

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
    
    // Debug logging
    console.log(`Week ${weeks.length}: ${currentWeekStart.toISOString()} to ${adjustedEnd.toISOString()}`);

    currentWeekStart.setDate(currentWeekStart.getDate() + 7);
  }

  return weeks;
};

// Add this type definition
type WeekTransactionProps = {
  weekTransactions: Transaction[];
  week: string;
};

// Add this component for displaying transactions
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

export default function Insights() {
  const [selectedMonth, setSelectedMonth] = useState(() => {
    const today = new Date();
    return `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}`;
  });

  const { data: transactions, isLoading } = useQuery({
    queryKey: ['/api/transactions', selectedMonth],
    queryFn: async () => {
      const response = await fetch('/api/transactions');
      if (!response.ok) {
        throw new Error('Failed to fetch transactions');
      }
      const data = await response.json();
      return data as Transaction[];
    },
    staleTime: 30000, // Consider data fresh for 30 seconds
    refetchOnMount: true,
    refetchOnWindowFocus: true,
  });

  // Filter transactions for selected month
  const filterTransactionsForMonth = (transactions: Transaction[] | undefined) => {
    if (!transactions) return [];
    const [year, month] = selectedMonth.split('-').map(Number);
    return transactions.filter(t => {
      const date = new Date(t.date);
      return date.getFullYear() === year && date.getMonth() === month - 1;
    });
  };

  // Prepare monthly income vs expenses data
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

  // Prepare weekly expense distribution data
  const prepareWeeklyExpenseData = (transactions: Transaction[] | undefined) => {
    if (!transactions) return [];

    const filtered = filterTransactionsForMonth(transactions);
    const weeks = getWeeksInMonth(filtered, selectedMonth);
    
    // Collect all unique categories
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

      // Base result with week name
      const result: Record<string, any> = {
        week: `Week ${index + 1}`,
        _hasTransactions: weekTransactions.length > 0,
      };
      
      // If no transactions, set all categories to null (instead of 0)
      // This will prevent bars from being drawn
      if (weekTransactions.length === 0) {
        Array.from(uniqueCategories).forEach(category => {
          result[category] = null;
        });
      } else {
        // Initialize all categories with 0 for weeks with transactions
        Array.from(uniqueCategories).forEach(category => {
          result[category] = 0;
        });

        // Add up transactions by category
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

  // Extract categories from the prepared data
  const categories = Array.from(
    new Set(
      weeklyData.flatMap(week => 
        Object.keys(week).filter(key => 
          key !== 'week' && !key.startsWith('_')
        )
      )
    )
  );

  // Colors for charts
  const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884d8', '#82ca9d'];

  // Add this function to get transactions for a specific week
  const getWeekTransactions = (weekIndex: number) => {
    if (!transactions) return [];
    const filtered = filterTransactionsForMonth(transactions);
    const weeks = getWeeksInMonth(filtered, selectedMonth);
    if (!weeks[weekIndex]) return [];
    
    const weekTransactions = filtered.filter(t => {
      const transactionDate = new Date(t.date);
      // Set time to midnight for proper date comparison
      transactionDate.setHours(0, 0, 0, 0);
      
      const start = new Date(weeks[weekIndex].start);
      start.setHours(0, 0, 0, 0);
      
      const end = new Date(weeks[weekIndex].end);
      end.setHours(23, 59, 59, 999);
      
      // Debug log to trace specific transaction
      if (transactionDate.getDate() === 28) {
        console.log(`March 28 transaction: ${t.description}`);
        console.log(`Is in week ${weekIndex + 1}? ${transactionDate >= start && transactionDate <= end}`);
        console.log(`Date comparison: ${transactionDate.toISOString()} between ${start.toISOString()} and ${end.toISOString()}`);
      }
      
      return transactionDate >= start && transactionDate <= end;
    });
    
    // Sort transactions by date (newest first)
    return weekTransactions.sort((a, b) => 
      new Date(b.date).getTime() - new Date(a.date).getTime()
    );
  };

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
    <div className="p-8 space-y-8 max-w-7xl mx-auto">
      <div className="flex justify-between items-center bg-card p-6 rounded-lg shadow-sm">
        <h1 className="text-3xl font-bold text-foreground"> Financial Insights </h1>
        <Select value={selectedMonth} onValueChange={setSelectedMonth}>
          <SelectTrigger className="w-[240px]">
            <SelectValue placeholder="Select month" />
          </SelectTrigger>
          <SelectContent>
            {monthOptions.map(option => (
              <SelectItem key={option.value} value={option.value}>
                {option.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="grid gap-8 grid-cols-1 lg:grid-cols-2">
        {/* Category Breakdown - Moved to top */}
        <Card className="lg:col-span-2 shadow-lg hover:shadow-xl transition-shadow">
          <CardHeader className="space-y-2">
            <CardTitle className="text-2xl"> Category Breakdown </CardTitle>
            <p className="text-muted-foreground"> View expenses by category for each week </p>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <Skeleton className="w-full h-[300px]" />
            ) : weeklyData.length > 0 ? (
              <ResponsiveContainer width="100%" height={300}>
                <BarChart
                  data={weeklyData}
                  margin={{
                    top: 20,
                    right: 30,
                    left: 40,
                    bottom: 5,
                  }}
                  barGap={2}
                  barSize={30}
                  stackOffset="none"
                  onClick={(data) => {
                    if (data && data.activeTooltipIndex !== undefined) {
                      setSelectedWeek(prevWeek => 
                        prevWeek === data.activeTooltipIndex ? null : data.activeTooltipIndex
                      );
                    }
                  }}
                >
                  <XAxis dataKey="week" axisLine={false} tickLine={false} />
                  <YAxis
                    tickFormatter={value => `$${value}`}
                    axisLine={false}
                    tickLine={false}
                    width={80}
                  />
                  <Tooltip 
                    content={() => null}
                  />
                  <Legend verticalAlign="top" height={36} />
                  {categories.map((category, index) => (
                    <Bar
                      key={category}
                      dataKey={category}
                      name={category}
                      fill={COLORS[index % COLORS.length]}
                      radius={[4, 4, 0, 0]}
                      maxBarSize={50}
                      // Hide zero values
                      hide={false}
                    />
                  ))}
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className="flex items-center justify-center h-[300px] text-muted-foreground">
                No expense data available for this month.
              </div>
            )}
          </CardContent>
        </Card>

        {/* Weekly Trends */}
        <Card className="shadow-lg hover:shadow-xl transition-shadow">
          <CardHeader className="space-y-2">
            <CardTitle className="text-2xl"> Weekly Trends </CardTitle>
            <p className="text-muted-foreground"> Track your expense patterns week by week </p>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <Skeleton className="w-full h-[300px]" />
            ) : weeklyData.length > 0 ? (
              <ResponsiveContainer width="100%" height={300}>
                <LineChart
                  data={weeklyData}
                  margin={{
                    top: 20,
                    right: 30,
                    left: 40,
                    bottom: 5,
                  }}
                >
                  <XAxis dataKey="week" axisLine={false} tickLine={false} />
                  <YAxis
                    tickFormatter={value => `$${value}`}
                    axisLine={false}
                    tickLine={false}
                    width={80}
                  />
                  <Tooltip
                    formatter={(value, name) => [`$${Number(value).toFixed(2)}`, name]}
                    contentStyle={{
                      backgroundColor: 'hsl(var(--card))',
                      borderColor: 'hsl(var(--border))',
                      borderRadius: '8px',
                      boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)',
                    }}
                    labelStyle={{
                      fontWeight: 'bold',
                      marginBottom: '4px',
                    }}
                  />
                  <Legend verticalAlign="top" height={36} />
                  {categories.map((category, index) => (
                    <Line
                      key={category}
                      type="monotone"
                      dataKey={category}
                      name={category}
                      stroke={COLORS[index % COLORS.length]}
                      strokeWidth={2}
                      dot={{ r: 4 }}
                      activeDot={{ r: 6 }}
                    />
                  ))}
                </LineChart>
              </ResponsiveContainer>
            ) : (
              <div className="flex items-center justify-center h-[300px] text-muted-foreground">
                No expense data available for this month.
              </div>
            )}
          </CardContent>
        </Card>

        {/* Monthly Income vs Expenses Chart */}
        <Card className="shadow-lg hover:shadow-xl transition-shadow">
          <CardHeader className="space-y-2">
            <CardTitle className="text-2xl"> Monthly Overview </CardTitle>
            <p className="text-muted-foreground">
              {' '}
              Compare your income and expenses for the month{' '}
            </p>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <Skeleton className="w-full h-[400px]" />
            ) : monthlyData.length > 0 ? (
              <div className="space-y-6">
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart
                    data={monthlyData}
                    margin={{
                      top: 20,
                      right: 30,
                      left: 40,
                      bottom: 5,
                    }}
                    barGap={30}
                  >
                    <XAxis dataKey="name" axisLine={false} tickLine={false} />
                    <YAxis
                      tickFormatter={value => `$${value}`}
                      axisLine={false}
                      tickLine={false}
                      width={80}
                    />
                    <Tooltip
                      formatter={(value, name) => [`$${Number(value).toFixed(2)}`, name]}
                      contentStyle={{
                        backgroundColor: 'hsl(var(--card))',
                        borderColor: 'hsl(var(--border))',
                        borderRadius: '8px',
                        boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)',
                      }}
                      labelStyle={{
                        fontWeight: 'bold',
                        marginBottom: '4px',
                      }}
                    />
                    <Legend
                      verticalAlign="top"
                      height={36}
                      formatter={(value: string) => (
                        <span
                          style={{
                            color:
                              value === 'Income'
                                ? 'hsl(142.1 76.2% 36.3%)'
                                : 'hsl(346.8 77.2% 49.8%)',
                          }}
                        >
                          {value}
                        </span>
                      )}
                    />
                    <Bar
                      dataKey="income"
                      name="Income"
                      fill="hsl(142.1 76.2% 36.3%)"
                      radius={[4, 4, 0, 0]}
                      maxBarSize={80}
                    />
                    <Bar
                      dataKey="expense"
                      name="Expenses"
                      fill="hsl(346.8 77.2% 49.8%)"
                      radius={[4, 4, 0, 0]}
                      maxBarSize={80}
                    />
                  </BarChart>
                </ResponsiveContainer>

                <div className="grid grid-cols-3 gap-4">
                  <div className="p-3 rounded-lg bg-card/50 space-y-1 border shadow-sm">
                    <p className="text-sm font-medium text-muted-foreground"> Total Income </p>
                    <p className="text-xl font-bold text-success">
                      ${monthlyData[0].income.toFixed(2)}
                    </p>
                  </div>
                  <div className="p-3 rounded-lg bg-card/50 space-y-1 border shadow-sm">
                    <p className="text-sm font-medium text-muted-foreground"> Total Expenses </p>
                    <p className="text-xl font-bold text-destructive">
                      ${monthlyData[0].expense.toFixed(2)}
                    </p>
                  </div>
                  <div className="p-3 rounded-lg bg-card/50 space-y-1 border shadow-sm">
                    <p className="text-sm font-medium text-muted-foreground"> Net Savings </p>
                    <p
                      className={`text-xl font-bold ${monthlyData[0].savings >= 0 ? 'text-success' : 'text-destructive'}`}
                    >
                      ${monthlyData[0].savings.toFixed(2)}
                    </p>
                  </div>
                </div>
              </div>
            ) : (
              <div className="flex items-center justify-center h-[400px] text-muted-foreground">
                No transaction data available for this month.
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {selectedWeek !== null && weeklyData[selectedWeek] && (
        <div
          ref={tooltipRef}
          className="fixed z-50 bg-card border rounded-lg p-4 shadow-lg"
          style={{
            left: `calc(50% - 150px)`,
            top: '50%',
            pointerEvents: 'auto'
          }}
        >
          <div className="mb-3 flex items-center justify-between">
            <h3 className="text-md font-semibold">{weeklyData[selectedWeek].week}</h3>
            <button 
              className="text-muted-foreground hover:text-foreground"
              onClick={() => setSelectedWeek(null)}
            >
              ✕
            </button>
          </div>
          
          <div className="space-y-2 mb-3">
            {categories.map((category, index) => {
              const value = weeklyData[selectedWeek][category];
              if (!value) return null;
              
              return (
                <div key={index} className="flex items-center justify-between">
                  <div className="flex items-center">
                    <div 
                      className="w-3 h-3 rounded-full mr-2" 
                      style={{ backgroundColor: COLORS[index % COLORS.length] }}
                    />
                    <span className="text-sm">{category}:</span>
                  </div>
                  <span className="text-sm font-medium">${Number(value).toFixed(2)}</span>
                </div>
              );
            })}
          </div>
          
          <div>
            <h4 className="text-sm font-medium mb-2">Transactions:</h4>
            <div 
              className="h-[180px] w-[300px] rounded-md border overflow-auto"
              style={{ 
                overflowY: 'auto', 
                msOverflowStyle: 'auto',
                scrollbarWidth: 'auto'
              }}
            >
              <div className="p-1">
                {(() => {
                  const weekTransactions = getWeekTransactions(selectedWeek);
                  return weekTransactions.length > 0 ? (
                    weekTransactions.map((transaction, i) => (
                      <div
                        key={i}
                        className="flex flex-col space-y-1 rounded-md p-2 mb-2 hover:bg-accent/50 transition-colors border"
                      >
                        <p className="text-sm font-medium leading-none">
                          {transaction.description || 'Untitled Transaction'}
                        </p>
                        <div className="flex justify-between items-center">
                          <p className="text-xs text-muted-foreground">
                            {new Date(transaction.date).toLocaleDateString()}
                          </p>
                          <p className={`text-sm font-semibold ${
                            transaction.type === 'income' ? 'text-success' : 'text-destructive'
                          }`}>
                            ${Number(transaction.amount).toFixed(2)}
                          </p>
                        </div>
                        {transaction.category && (
                          <p className="text-xs text-muted-foreground">
                            Category: {transaction.category}
                          </p>
                        )}
                      </div>
                    ))
                  ) : (
                    <p className="text-sm text-muted-foreground">No transactions for this week</p>
                  );
                })()}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
