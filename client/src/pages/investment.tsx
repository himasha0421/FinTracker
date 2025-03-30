import { useQuery } from "@tanstack/react-query";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Skeleton } from "@/components/ui/skeleton";
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
} from "recharts";
import { TrendingUp, TrendingDown, PieChart as PieChartIcon, BarChart2, ArrowRight, ExternalLink } from "lucide-react";
import { Progress } from "@/components/ui/progress";
import type { Account } from "@shared/schema";

// Sample portfolio allocation data - this would ideally come from the API
const portfolioData = [
  { name: "Stocks", value: 70, color: "#0088FE" },
  { name: "Bonds", value: 15, color: "#00C49F" },
  { name: "Cash", value: 10, color: "#FFBB28" },
  { name: "Real Estate", value: 5, color: "#FF8042" },
];

// Sample performance data - this would ideally come from the API
const performanceData = [
  { month: "Jan", value: 10000 },
  { month: "Feb", value: 10200 },
  { month: "Mar", value: 10150 },
  { month: "Apr", value: 10400 },
  { month: "May", value: 10600 },
  { month: "Jun", value: 10550 },
  { month: "Jul", value: 10800 },
  { month: "Aug", value: 11000 },
  { month: "Sep", value: 11200 },
  { month: "Oct", value: 11500 },
  { month: "Nov", value: 11700 },
  { month: "Dec", value: 12000 },
];

// Sample investment opportunities
const investmentOpportunities = [
  {
    title: "S&P 500 ETF",
    description: "Broad market exposure with low fees",
    risk: "Medium",
    returns: "8-10% historical average",
    minInvestment: "$100",
  },
  {
    title: "High-Yield Savings",
    description: "FDIC insured with competitive rates",
    risk: "Low",
    returns: "3-4% current APY",
    minInvestment: "$0",
  },
  {
    title: "Tech Growth Fund",
    description: "Focus on technology sector growth",
    risk: "High",
    returns: "12-15% potential returns",
    minInvestment: "$500",
  },
];

export default function Investment() {
  const { data: accounts, isLoading } = useQuery({
    queryKey: ['/api/accounts'],
  });
  
  // Filter to get only investment accounts
  const investmentAccounts = accounts?.filter((account: Account) => account.type === 'investment') || [];
  
  // Calculate total investment value
  const totalInvestmentValue = investmentAccounts.reduce(
    (sum: number, account: Account) => sum + Number(account.balance),
    0
  );
  
  // Format currency
  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
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
          <div className="grid gap-6 md:grid-cols-3">
            {/* Portfolio Value Card */}
            <Card>
              <CardHeader className="pb-2">
                <CardDescription>Total Investment Value</CardDescription>
                {isLoading ? (
                  <Skeleton className="h-8 w-28" />
                ) : (
                  <CardTitle className="text-2xl font-mono">
                    {formatCurrency(totalInvestmentValue)}
                  </CardTitle>
                )}
              </CardHeader>
              <CardContent>
                <div className="flex items-center text-positive">
                  <TrendingUp className="mr-1 h-4 w-4" />
                  <span className="text-sm">+12.4% this year</span>
                </div>
              </CardContent>
            </Card>
            
            {/* Investment Accounts Card */}
            <Card className="md:col-span-2">
              <CardHeader>
                <CardTitle>Investment Accounts</CardTitle>
              </CardHeader>
              <CardContent>
                {isLoading ? (
                  <div className="space-y-4">
                    {Array.from({ length: 2 }).map((_, i) => (
                      <div key={i} className="flex justify-between items-center">
                        <div className="flex items-center">
                          <Skeleton className="h-8 w-8 rounded-md mr-3" />
                          <div>
                            <Skeleton className="h-4 w-32 mb-1" />
                            <Skeleton className="h-3 w-20" />
                          </div>
                        </div>
                        <Skeleton className="h-5 w-20" />
                      </div>
                    ))}
                  </div>
                ) : investmentAccounts.length > 0 ? (
                  <div className="space-y-4">
                    {investmentAccounts.map((account: Account) => (
                      <div key={account.id} className="flex justify-between items-center">
                        <div className="flex items-center">
                          <div className="w-8 h-8 rounded-md bg-purple-500 bg-opacity-20 flex items-center justify-center mr-3">
                            <TrendingUp className="h-4 w-4 text-purple-400" />
                          </div>
                          <div>
                            <div className="font-medium">{account.name}</div>
                            <div className="text-sm text-muted-foreground">{account.description}</div>
                          </div>
                        </div>
                        <div className="font-mono font-medium">
                          {formatCurrency(Number(account.balance))}
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="py-8 text-center">
                    <p className="text-muted-foreground mb-4">
                      You don't have any investment accounts yet.
                    </p>
                    <Button>Add Investment Account</Button>
                  </div>
                )}
              </CardContent>
            </Card>
            
            {/* Portfolio Allocation Card */}
            <Card className="md:col-span-2">
              <CardHeader>
                <CardTitle>Portfolio Allocation</CardTitle>
              </CardHeader>
              <CardContent className="flex justify-center">
                <div className="w-full max-w-md">
                  <ResponsiveContainer width="100%" height={250}>
                    <PieChart>
                      <Pie
                        data={portfolioData}
                        cx="50%"
                        cy="50%"
                        innerRadius={60}
                        outerRadius={80}
                        fill="#8884d8"
                        paddingAngle={2}
                        dataKey="value"
                        label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                      >
                        {portfolioData.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={entry.color} />
                        ))}
                      </Pie>
                      <Tooltip 
                        formatter={(value) => [`${value}%`, ""]}
                        contentStyle={{ backgroundColor: 'hsl(var(--card))', borderColor: 'hsl(var(--border))' }}
                      />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>
            
            {/* Investment Goals Card */}
            <Card>
              <CardHeader>
                <CardTitle>Investment Goals</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <div className="flex justify-between text-sm mb-1">
                    <span>Retirement Fund</span>
                    <span>35%</span>
                  </div>
                  <Progress value={35} className="h-2" />
                  <p className="text-xs text-muted-foreground mt-1">Target: $500,000 by 2050</p>
                </div>
                
                <div>
                  <div className="flex justify-between text-sm mb-1">
                    <span>College Fund</span>
                    <span>15%</span>
                  </div>
                  <Progress value={15} className="h-2" />
                  <p className="text-xs text-muted-foreground mt-1">Target: $100,000 by 2035</p>
                </div>
                
                <div>
                  <div className="flex justify-between text-sm mb-1">
                    <span>Home Down Payment</span>
                    <span>65%</span>
                  </div>
                  <Progress value={65} className="h-2" />
                  <p className="text-xs text-muted-foreground mt-1">Target: $50,000 by 2026</p>
                </div>
              </CardContent>
              <CardFooter>
                <Button variant="outline" size="sm" className="w-full">
                  <ExternalLink className="mr-2 h-4 w-4" />
                  View All Goals
                </Button>
              </CardFooter>
            </Card>
          </div>
        </TabsContent>
        
        <TabsContent value="performance" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Investment Performance</CardTitle>
              <CardDescription>Year-to-date performance of your portfolio</CardDescription>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={300}>
                <LineChart
                  data={performanceData}
                  margin={{
                    top: 20,
                    right: 30,
                    left: 20,
                    bottom: 5,
                  }}
                >
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                  <XAxis dataKey="month" stroke="hsl(var(--muted-foreground))" />
                  <YAxis 
                    stroke="hsl(var(--muted-foreground))"
                    tickFormatter={(value) => `$${value.toLocaleString()}`}
                  />
                  <Tooltip 
                    formatter={(value) => [formatCurrency(Number(value)), "Portfolio Value"]}
                    contentStyle={{ backgroundColor: 'hsl(var(--card))', borderColor: 'hsl(var(--border))' }}
                  />
                  <Line
                    type="monotone"
                    dataKey="value"
                    stroke="hsl(var(--primary))"
                    strokeWidth={2}
                    dot={{ r: 4 }}
                    activeDot={{ r: 6 }}
                  />
                </LineChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
          
          <div className="grid gap-6 md:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle>Top Performers</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex justify-between items-center">
                  <div className="flex items-center">
                    <div className="w-8 h-8 rounded-md bg-green-500 bg-opacity-20 flex items-center justify-center mr-3">
                      <TrendingUp className="h-4 w-4 text-green-400" />
                    </div>
                    <div>
                      <div className="font-medium">Tech ETF</div>
                      <div className="text-sm text-muted-foreground">Technology Sector</div>
                    </div>
                  </div>
                  <div className="text-positive">+24.5%</div>
                </div>
                
                <div className="flex justify-between items-center">
                  <div className="flex items-center">
                    <div className="w-8 h-8 rounded-md bg-green-500 bg-opacity-20 flex items-center justify-center mr-3">
                      <TrendingUp className="h-4 w-4 text-green-400" />
                    </div>
                    <div>
                      <div className="font-medium">S&P 500 Index</div>
                      <div className="text-sm text-muted-foreground">Broad Market</div>
                    </div>
                  </div>
                  <div className="text-positive">+18.2%</div>
                </div>
                
                <div className="flex justify-between items-center">
                  <div className="flex items-center">
                    <div className="w-8 h-8 rounded-md bg-green-500 bg-opacity-20 flex items-center justify-center mr-3">
                      <TrendingUp className="h-4 w-4 text-green-400" />
                    </div>
                    <div>
                      <div className="font-medium">Renewable Energy Fund</div>
                      <div className="text-sm text-muted-foreground">Energy Sector</div>
                    </div>
                  </div>
                  <div className="text-positive">+15.8%</div>
                </div>
              </CardContent>
            </Card>
            
            <Card>
              <CardHeader>
                <CardTitle>Under Performers</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex justify-between items-center">
                  <div className="flex items-center">
                    <div className="w-8 h-8 rounded-md bg-red-500 bg-opacity-20 flex items-center justify-center mr-3">
                      <TrendingDown className="h-4 w-4 text-red-400" />
                    </div>
                    <div>
                      <div className="font-medium">Bond Fund</div>
                      <div className="text-sm text-muted-foreground">Fixed Income</div>
                    </div>
                  </div>
                  <div className="text-negative">-2.1%</div>
                </div>
                
                <div className="flex justify-between items-center">
                  <div className="flex items-center">
                    <div className="w-8 h-8 rounded-md bg-red-500 bg-opacity-20 flex items-center justify-center mr-3">
                      <TrendingDown className="h-4 w-4 text-red-400" />
                    </div>
                    <div>
                      <div className="font-medium">Financial Sector ETF</div>
                      <div className="text-sm text-muted-foreground">Banking & Finance</div>
                    </div>
                  </div>
                  <div className="text-negative">-1.5%</div>
                </div>
                
                <div className="flex justify-between items-center">
                  <div className="flex items-center">
                    <div className="w-8 h-8 rounded-md bg-yellow-500 bg-opacity-20 flex items-center justify-center mr-3">
                      <TrendingDown className="h-4 w-4 text-yellow-400" />
                    </div>
                    <div>
                      <div className="font-medium">International Markets</div>
                      <div className="text-sm text-muted-foreground">Global Exposure</div>
                    </div>
                  </div>
                  <div className="text-negative">-0.7%</div>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
        
        <TabsContent value="opportunities" className="space-y-6">
          <div className="grid gap-6 md:grid-cols-3">
            {investmentOpportunities.map((opportunity, index) => (
              <Card key={index}>
                <CardHeader>
                  <CardTitle>{opportunity.title}</CardTitle>
                  <CardDescription>{opportunity.description}</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    <div className="flex justify-between">
                      <span className="text-sm text-muted-foreground">Risk Level:</span>
                      <span className="text-sm font-medium">{opportunity.risk}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-sm text-muted-foreground">Expected Returns:</span>
                      <span className="text-sm font-medium">{opportunity.returns}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-sm text-muted-foreground">Minimum Investment:</span>
                      <span className="text-sm font-medium">{opportunity.minInvestment}</span>
                    </div>
                  </div>
                </CardContent>
                <CardFooter>
                  <Button className="w-full">
                    Learn More
                    <ArrowRight className="ml-2 h-4 w-4" />
                  </Button>
                </CardFooter>
              </Card>
            ))}
          </div>
          
          <Card>
            <CardHeader className="flex flex-row items-start justify-between">
              <div>
                <CardTitle>Investment Education</CardTitle>
                <CardDescription>Learn more about investing strategies and concepts</CardDescription>
              </div>
              <PieChartIcon className="h-6 w-6 text-primary" />
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="border rounded-md p-4">
                  <h3 className="font-medium mb-1">Understanding Asset Allocation</h3>
                  <p className="text-sm text-muted-foreground mb-2">
                    Learn how to properly diversify your investments across different asset classes.
                  </p>
                  <Button variant="outline" size="sm">Read Article</Button>
                </div>
                
                <div className="border rounded-md p-4">
                  <h3 className="font-medium mb-1">Tax-Efficient Investing</h3>
                  <p className="text-sm text-muted-foreground mb-2">
                    Strategies to minimize tax impact and maximize your investment returns.
                  </p>
                  <Button variant="outline" size="sm">Read Article</Button>
                </div>
                
                <div className="border rounded-md p-4">
                  <h3 className="font-medium mb-1">Retirement Planning Basics</h3>
                  <p className="text-sm text-muted-foreground mb-2">
                    Essential steps to prepare for a financially secure retirement.
                  </p>
                  <Button variant="outline" size="sm">Read Article</Button>
                </div>
              </div>
            </CardContent>
            <CardFooter>
              <Button variant="outline" className="w-full">
                <BarChart2 className="mr-2 h-4 w-4" />
                View Learning Center
              </Button>
            </CardFooter>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
