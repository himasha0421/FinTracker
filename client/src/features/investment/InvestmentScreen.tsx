import { useQuery } from '@tanstack/react-query';
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
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
import {
  TrendingUp,
  TrendingDown,
  PieChart as PieChartIcon,
  BarChart2,
  ArrowRight,
  ExternalLink,
} from 'lucide-react';
import { Progress } from '@/components/ui/progress';
import type { Account } from '@shared/schema';
import { accountsListQuery } from '@/features/accounts/api';

const portfolioData = [
  { name: 'Stocks', value: 70, color: '#0088FE' },
  { name: 'Bonds', value: 15, color: '#00C49F' },
  { name: 'Cash', value: 10, color: '#FFBB28' },
  { name: 'Real Estate', value: 5, color: '#FF8042' },
];

const performanceData = [
  { month: 'Jan', value: 10000 },
  { month: 'Feb', value: 10200 },
  { month: 'Mar', value: 10150 },
  { month: 'Apr', value: 10400 },
  { month: 'May', value: 10600 },
  { month: 'Jun', value: 10550 },
  { month: 'Jul', value: 10800 },
  { month: 'Aug', value: 11000 },
  { month: 'Sep', value: 11200 },
  { month: 'Oct', value: 11500 },
  { month: 'Nov', value: 11700 },
  { month: 'Dec', value: 12000 },
];

const investmentOpportunities = [
  {
    title: 'S&P 500 ETF',
    description: 'Broad market exposure with low fees',
    risk: 'Medium',
    returns: '8-10% historical average',
    minInvestment: '$100',
  },
  {
    title: 'High-Yield Savings',
    description: 'FDIC insured with competitive rates',
    risk: 'Low',
    returns: '3-4% current APY',
    minInvestment: '$0',
  },
  {
    title: 'Tech Growth Fund',
    description: 'Focus on technology sector growth',
    risk: 'High',
    returns: '12-15% potential returns',
    minInvestment: '$500',
  },
];

export default function InvestmentScreen() {
  const { data: accounts, isLoading } = useQuery(accountsListQuery());

  const investmentAccounts =
    accounts?.filter((account: Account) => account.type === 'investment') || [];

  const totalInvestmentValue = investmentAccounts.reduce(
    (sum: number, account: Account) => sum + Number(account.balance),
    0
  );

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(value);
  };

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">Investment Portfolio</h1>

      <Tabs defaultValue="overview" className="space-y-6">
        <TabsList>
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="performance">Performance</TabsTrigger>
          <TabsTrigger value="opportunities">Opportunities</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-6">
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="flex items-center gap-2">
                  <PieChartIcon className="h-5 w-5 text-blue-400" />
                  Portfolio Allocation
                </CardTitle>
                <CardDescription>Distribution across asset classes</CardDescription>
              </CardHeader>
              <CardContent>
                {isLoading ? (
                  <Skeleton className="h-[200px]" />
                ) : (
                  <div className="h-[200px]">
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie
                          data={portfolioData}
                          cx="50%"
                          cy="50%"
                          labelLine={false}
                          outerRadius={80}
                          dataKey="value"
                        >
                          {portfolioData.map((entry, index) => (
                            <Cell key={`cell-${index}`} fill={entry.color} />
                          ))}
                        </Pie>
                        <Tooltip />
                      </PieChart>
                    </ResponsiveContainer>
                  </div>
                )}
                <div className="grid grid-cols-2 gap-3 mt-4">
                  {portfolioData.map(item => (
                    <div key={item.name} className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span className="inline-block h-2 w-2 rounded-full" style={{ background: item.color }} />
                        <span className="text-sm text-muted-foreground">{item.name}</span>
                      </div>
                      <span className="text-sm font-medium">{item.value}%</span>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="flex items-center gap-2">
                  <BarChart2 className="h-5 w-5 text-green-400" />
                  Investment Value
                </CardTitle>
                <CardDescription>Total across investment accounts</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {isLoading ? (
                  <Skeleton className="h-10 w-32" />
                ) : (
                  <div className="text-3xl font-bold">{formatCurrency(totalInvestmentValue)}</div>
                )}
                <div className="space-y-2">
                  <div className="flex items-center justify-between text-sm">
                    <span>Year-to-date return</span>
                    <span className="text-green-400">+8.4%</span>
                  </div>
                  <Progress value={68} className="h-2" />
                  <div className="flex items-center justify-between text-sm">
                    <span>Risk exposure</span>
                    <span className="text-yellow-400">Moderate</span>
                  </div>
                  <Progress value={45} className="h-2" />
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="flex items-center gap-2">
                  <TrendingUp className="h-5 w-5 text-indigo-400" />
                  Recent Performance
                </CardTitle>
                <CardDescription>Trailing 12-month portfolio value</CardDescription>
              </CardHeader>
              <CardContent>
                {isLoading ? (
                  <Skeleton className="h-[180px]" />
                ) : (
                  <div className="h-[180px]">
                    <ResponsiveContainer width="100%" height="100%">
                      <LineChart data={performanceData}>
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis dataKey="month" />
                        <YAxis />
                        <Tooltip />
                        <Line type="monotone" dataKey="value" stroke="#8884d8" strokeWidth={2} />
                      </LineChart>
                    </ResponsiveContainer>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="performance">
          <Card>
            <CardHeader>
              <CardTitle>Performance Details</CardTitle>
              <CardDescription>Track portfolio growth and drawdowns</CardDescription>
            </CardHeader>
            <CardContent>
              {isLoading ? (
                <Skeleton className="h-[300px]" />
              ) : (
                <div className="h-[300px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={performanceData}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="month" />
                      <YAxis />
                      <Tooltip />
                      <Line type="monotone" dataKey="value" stroke="#22c55e" strokeWidth={2} />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="opportunities">
          <div className="grid gap-6 md:grid-cols-2">
            {investmentOpportunities.map((opportunity, index) => (
              <Card key={index} className="flex flex-col">
                <CardHeader>
                  <CardTitle>{opportunity.title}</CardTitle>
                  <CardDescription>{opportunity.description}</CardDescription>
                </CardHeader>
                <CardContent className="space-y-2">
                  <div className="flex items-center justify-between text-sm">
                    <span>Risk</span>
                    <span className={index === 2 ? 'text-red-400' : index === 0 ? 'text-yellow-400' : 'text-green-400'}>
                      {opportunity.risk}
                    </span>
                  </div>
                  <div className="flex items-center justify-between text-sm">
                    <span>Returns</span>
                    <span className="text-muted-foreground">{opportunity.returns}</span>
                  </div>
                  <div className="flex items-center justify-between text-sm">
                    <span>Minimum</span>
                    <span className="text-muted-foreground">{opportunity.minInvestment}</span>
                  </div>
                </CardContent>
                <CardFooter className="mt-auto flex justify-between">
                  <Button variant="outline">
                    Details <ArrowRight className="ml-2 h-4 w-4" />
                  </Button>
                  <Button variant="ghost">
                    Open <ExternalLink className="ml-2 h-4 w-4" />
                  </Button>
                </CardFooter>
              </Card>
            ))}
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
