import { useQuery } from "@tanstack/react-query";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Legend,
} from "recharts";
import type { Transaction } from "@shared/schema";

export default function Insights() {
  const { data: transactions, isLoading } = useQuery({
    queryKey: ['/api/transactions'],
  });

  // Function to prepare expense by category data for pie chart
  const prepareExpensesByCategoryData = (transactions: Transaction[] | undefined) => {
    if (!transactions) return [];
    
    const expensesByCategory: Record<string, number> = {};
    
    transactions.forEach(transaction => {
      if (transaction.type === 'expense' && transaction.category) {
        const amount = Number(transaction.amount);
        if (expensesByCategory[transaction.category]) {
          expensesByCategory[transaction.category] += amount;
        } else {
          expensesByCategory[transaction.category] = amount;
        }
      }
    });
    
    return Object.entries(expensesByCategory).map(([name, value]) => ({
      name,
      value,
    }));
  };

  // Function to prepare monthly spending/income data for bar chart
  const prepareMonthlyData = (transactions: Transaction[] | undefined) => {
    if (!transactions) return [];
    
    const monthlyData: Record<string, { income: number; expense: number }> = {};
    
    transactions.forEach(transaction => {
      const date = new Date(transaction.date);
      const monthYear = `${date.toLocaleString('default', { month: 'short' })} ${date.getFullYear()}`;
      const amount = Number(transaction.amount);
      
      if (!monthlyData[monthYear]) {
        monthlyData[monthYear] = { income: 0, expense: 0 };
      }
      
      if (transaction.type === 'income') {
        monthlyData[monthYear].income += amount;
      } else {
        monthlyData[monthYear].expense += amount;
      }
    });
    
    return Object.entries(monthlyData).map(([month, data]) => ({
      month,
      income: data.income,
      expense: data.expense,
    }));
  };

  const expensesByCategoryData = prepareExpensesByCategoryData(transactions);
  const monthlyData = prepareMonthlyData(transactions);
  
  // Sort monthly data chronologically
  monthlyData.sort((a, b) => {
    const [monthA, yearA] = a.month.split(' ');
    const [monthB, yearB] = b.month.split(' ');
    
    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    
    if (yearA !== yearB) {
      return Number(yearA) - Number(yearB);
    }
    
    return months.indexOf(monthA) - months.indexOf(monthB);
  });

  // Colors for pie chart
  const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884d8', '#82ca9d'];
  
  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">Financial Insights</h1>
      
      <div className="grid gap-6 md:grid-cols-2">
        {/* Monthly Income vs Expenses Chart */}
        <Card className="col-span-2">
          <CardHeader>
            <CardTitle>Monthly Income vs Expenses</CardTitle>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <Skeleton className="w-full h-[300px]" />
            ) : monthlyData.length > 0 ? (
              <ResponsiveContainer width="100%" height={300}>
                <BarChart
                  data={monthlyData}
                  margin={{
                    top: 20,
                    right: 30,
                    left: 20,
                    bottom: 5,
                  }}
                >
                  <XAxis dataKey="month" />
                  <YAxis />
                  <Tooltip 
                    formatter={(value) => [`$${value.toFixed(2)}`, ""]}
                    contentStyle={{ backgroundColor: 'hsl(var(--card))', borderColor: 'hsl(var(--border))' }}
                  />
                  <Legend />
                  <Bar dataKey="income" name="Income" fill="hsl(var(--chart-1))" />
                  <Bar dataKey="expense" name="Expenses" fill="hsl(var(--chart-2))" />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className="flex items-center justify-center h-[300px] text-muted-foreground">
                No transaction data available for chart.
              </div>
            )}
          </CardContent>
        </Card>
        
        {/* Expenses by Category Chart */}
        <Card>
          <CardHeader>
            <CardTitle>Expenses by Category</CardTitle>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <Skeleton className="w-full h-[300px]" />
            ) : expensesByCategoryData.length > 0 ? (
              <ResponsiveContainer width="100%" height={300}>
                <PieChart>
                  <Pie
                    data={expensesByCategoryData}
                    cx="50%"
                    cy="50%"
                    labelLine={false}
                    outerRadius={80}
                    fill="#8884d8"
                    dataKey="value"
                    label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                  >
                    {expensesByCategoryData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip 
                    formatter={(value) => [`$${Number(value).toFixed(2)}`, ""]}
                    contentStyle={{ backgroundColor: 'hsl(var(--card))', borderColor: 'hsl(var(--border))' }}
                  />
                  <Legend />
                </PieChart>
              </ResponsiveContainer>
            ) : (
              <div className="flex items-center justify-center h-[300px] text-muted-foreground">
                No expense data available for chart.
              </div>
            )}
          </CardContent>
        </Card>
        
        {/* Spending Trend Analysis */}
        <Card>
          <CardHeader>
            <CardTitle>Spending Trends</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {isLoading ? (
                Array.from({ length: 3 }).map((_, index) => (
                  <div key={index} className="space-y-2">
                    <Skeleton className="h-4 w-1/3" />
                    <Skeleton className="h-3 w-full" />
                  </div>
                ))
              ) : transactions && transactions.length > 0 ? (
                <>
                  <div className="space-y-1">
                    <div className="flex justify-between">
                      <span className="font-medium">Top Expense Category</span>
                      <span className="font-mono">
                        {expensesByCategoryData.length > 0 
                          ? expensesByCategoryData.sort((a, b) => b.value - a.value)[0]?.name || 'N/A'
                          : 'N/A'}
                      </span>
                    </div>
                    <p className="text-sm text-muted-foreground">
                      This is where most of your money is being spent.
                    </p>
                  </div>
                  
                  <div className="space-y-1">
                    <div className="flex justify-between">
                      <span className="font-medium">Average Monthly Spending</span>
                      <span className="font-mono">
                        {monthlyData.length > 0
                          ? `$${(monthlyData.reduce((acc, curr) => acc + curr.expense, 0) / monthlyData.length).toFixed(2)}`
                          : '$0.00'}
                      </span>
                    </div>
                    <p className="text-sm text-muted-foreground">
                      Your typical monthly expenses.
                    </p>
                  </div>
                  
                  <div className="space-y-1">
                    <div className="flex justify-between">
                      <span className="font-medium">Monthly Savings Rate</span>
                      <span className="font-mono">
                        {monthlyData.length > 0
                          ? (() => {
                              const totalIncome = monthlyData.reduce((acc, curr) => acc + curr.income, 0);
                              const totalExpense = monthlyData.reduce((acc, curr) => acc + curr.expense, 0);
                              return totalIncome > 0 
                                ? `${(((totalIncome - totalExpense) / totalIncome) * 100).toFixed(1)}%`
                                : '0%';
                            })()
                          : '0%'}
                      </span>
                    </div>
                    <p className="text-sm text-muted-foreground">
                      Percentage of income you save on average.
                    </p>
                  </div>
                </>
              ) : (
                <div className="py-8 text-center text-muted-foreground">
                  No data available for analysis. Add transactions to see insights.
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
