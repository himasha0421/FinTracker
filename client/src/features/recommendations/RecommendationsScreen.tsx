import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { useQuery } from '@tanstack/react-query';
import { Skeleton } from '@/components/ui/skeleton';
import {
  AlertCircle,
  Check,
  Lightbulb,
  TrendingUp,
  DollarSign,
  Shield,
  ArrowRight,
} from 'lucide-react';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import type { Account, Transaction, FinancialGoal } from '@shared/schema';
import { useFinance } from '@/lib/context';
import { accountsListQuery } from '@/features/accounts/api';
import { transactionsListQuery } from '@/features/transactions/api';
import { goalsListQuery } from '@/features/goals/api';

export default function RecommendationsScreen() {
  const { data: accounts, isLoading: isLoadingAccounts } = useQuery(accountsListQuery());

  const { data: transactions, isLoading: isLoadingTransactions } =
    useQuery(transactionsListQuery());

  const { data: goals, isLoading: isLoadingGoals } = useQuery(goalsListQuery());

  const { totalBalance } = useFinance();

  const isLoading = isLoadingAccounts || isLoadingTransactions || isLoadingGoals;

  const generateRecommendations = (
    accounts: Account[] | undefined,
    transactions: Transaction[] | undefined,
    goals: FinancialGoal[] | undefined,
    totalBalance: number
  ) => {
    const recommendations = [];

    const emergencyFundGoal = goals?.find(
      goal =>
        goal.name.toLowerCase().includes('emergency') ||
        goal.description?.toLowerCase().includes('emergency')
    );

    if (!emergencyFundGoal) {
      recommendations.push({
        title: 'Start an Emergency Fund',
        description: 'Aim to save 3-6 months of living expenses for unexpected events.',
        icon: <Shield className="h-5 w-5 text-blue-400" />,
        action: 'Create Goal',
        priority: 'high',
      });
    }

    if (transactions && transactions.length > 0) {
      const expenseTransactions = transactions.filter(tx => tx.type === 'expense');
      const subscriptions = expenseTransactions.filter(
        tx =>
          tx.description.toLowerCase().includes('subscription') ||
          tx.category?.toLowerCase() === 'software' ||
          tx.description.toLowerCase().includes('netflix') ||
          tx.description.toLowerCase().includes('spotify')
      );

      if (subscriptions.length >= 3) {
        recommendations.push({
          title: 'Review Your Subscriptions',
          description:
            'You have multiple subscription services. Consider evaluating which ones you truly need.',
          icon: <DollarSign className="h-5 w-5 text-yellow-400" />,
          action: 'View Transactions',
          priority: 'medium',
        });
      }

      const expenseCategories: Record<string, number> = {};
      expenseTransactions.forEach(tx => {
        if (tx.category) {
          if (expenseCategories[tx.category]) {
            expenseCategories[tx.category] += Number(tx.amount);
          } else {
            expenseCategories[tx.category] = Number(tx.amount);
          }
        }
      });

      const topExpenseCategory = Object.entries(expenseCategories).sort(([, a], [, b]) => b - a)[0];

      if (topExpenseCategory) {
        recommendations.push({
          title: `High Spending on ${topExpenseCategory[0]}`,
          description: `Your highest expense category is ${topExpenseCategory[0]}. Look for ways to reduce these expenses.`,
          icon: <AlertCircle className="h-5 w-5 text-red-400" />,
          action: 'View Insights',
          priority: 'medium',
        });
      }
    }

    const hasInvestments = accounts?.some(account => account.type === 'investment');
    if (!hasInvestments) {
      recommendations.push({
        title: 'Start Investing for the Future',
        description: 'Consider opening an investment account to grow your wealth over time.',
        icon: <TrendingUp className="h-5 w-5 text-green-400" />,
        action: 'Open Investment Account',
        priority: 'high',
      });
    }

    const accountList = accounts ?? [];

    if (accountList.length > 0) {
      const averageBalance =
        accountList.reduce((sum, account) => sum + Number(account.balance), 0) /
        accountList.length;

      if (totalBalance < averageBalance * 0.5) {
        recommendations.push({
          title: 'Build Cash Cushion',
          description:
            'Your total balance is lower than your average. Consider transferring funds to increase liquidity.',
          icon: <Lightbulb className="h-5 w-5 text-amber-400" />,
          action: 'Review Accounts',
          priority: 'medium',
        });
      }
    }

    return recommendations;
  };

  const recommendations = generateRecommendations(accounts, transactions, goals, totalBalance);

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'high':
        return 'bg-red-500/10 text-red-400';
      case 'medium':
        return 'bg-yellow-500/10 text-yellow-400';
      default:
        return 'bg-blue-500/10 text-blue-400';
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Personalized Recommendations</h1>
          <p className="text-muted-foreground">
            AI-assisted insights to improve your financial wellness
          </p>
        </div>
        <Button variant="outline">
          <Check className="mr-2 h-4 w-4" />
          Mark All as Read
        </Button>
      </div>

      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        <Card className="bg-gradient-to-br from-blue-500/10 via-blue-500/5 to-transparent border-blue-500/20">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-blue-200">
              <Lightbulb className="h-5 w-5" />
              Smart Tips
            </CardTitle>
            <CardDescription className="text-blue-100">
              Quick wins to optimize your finances
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex items-center gap-3 text-blue-50">
              <div className="h-2 w-2 rounded-full bg-blue-300" />
              Automate transfers to savings after each paycheck
            </div>
            <div className="flex items-center gap-3 text-blue-50">
              <div className="h-2 w-2 rounded-full bg-blue-300" />
              Review subscriptions quarterly to remove unused services
            </div>
            <div className="flex items-center gap-3 text-blue-50">
              <div className="h-2 w-2 rounded-full bg-blue-300" />
              Set category budgets for food, entertainment, and shopping
            </div>
          </CardContent>
          <CardFooter>
            <Button variant="secondary" className="w-full">
              View Checklist
              <ArrowRight className="ml-2 h-4 w-4" />
            </Button>
          </CardFooter>
        </Card>

        <Card className="border-green-500/20">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <TrendingUp className="h-5 w-5 text-green-400" />
              Investment Opportunities
            </CardTitle>
            <CardDescription>
              Curated options based on your risk profile and goals
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {['S&P 500 ETF', 'High-Yield Savings', 'Tech Growth Fund'].map((item, index) => (
              <div key={item} className="flex items-start justify-between gap-3">
                <div>
                  <p className="font-medium">{item}</p>
                  <p className="text-sm text-muted-foreground">
                    {index === 0
                      ? 'Broad market exposure with low fees'
                      : index === 1
                        ? 'FDIC insured with competitive rates'
                        : 'Growth-focused with higher risk'}
                  </p>
                </div>
                <Button variant="ghost" size="sm">
                  Details
                </Button>
              </div>
            ))}
          </CardContent>
        </Card>

        <Card className="border-amber-500/20">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <DollarSign className="h-5 w-5 text-amber-400" />
              Cash Flow Health
            </CardTitle>
            <CardDescription>Overview of your liquidity and spending patterns</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              <div className="flex items-center justify-between text-sm">
                <span>Emergency Fund</span>
                <span className="text-amber-300">Needs attention</span>
              </div>
              <div className="flex items-center justify-between text-sm">
                <span>Subscription Spend</span>
                <span className="text-amber-300">Review suggested</span>
              </div>
              <div className="flex items-center justify-between text-sm">
                <span>Investment Allocation</span>
                <span className="text-green-300">On track</span>
              </div>
            </div>
          </CardContent>
          <CardFooter>
            <Button variant="outline" className="w-full">
              View Details
            </Button>
          </CardFooter>
        </Card>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Priority Actions</CardTitle>
            <CardDescription>Steps to improve your financial posture</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {isLoading ? (
              Array.from({ length: 3 }).map((_, index) => (
                <div key={index} className="flex items-center justify-between p-3 rounded-lg border">
                  <div className="space-y-2">
                    <Skeleton className="h-4 w-40" />
                    <Skeleton className="h-3 w-24" />
                  </div>
                  <Skeleton className="h-8 w-20" />
                </div>
              ))
            ) : recommendations.length > 0 ? (
              recommendations.map((rec, index) => (
                <div
                  key={index}
                  className="flex items-center justify-between p-3 rounded-lg border bg-card"
                >
                  <div className="space-y-1">
                    <p className="font-medium flex items-center gap-2">
                      {rec.icon}
                      {rec.title}
                    </p>
                    <p className="text-sm text-muted-foreground">{rec.description}</p>
                    <span className={`inline-flex px-2 py-1 rounded-full text-xs ${getPriorityColor(rec.priority)}`}>
                      {rec.priority} priority
                    </span>
                  </div>
                  <Button variant="ghost" size="sm">
                    {rec.action}
                  </Button>
                </div>
              ))
            ) : (
              <div className="text-center text-muted-foreground py-6">
                No recommendations available. Keep up the good work!
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Alerts & Notices</CardTitle>
            <CardDescription>Important updates that need your attention</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <Alert variant="default">
              <AlertCircle className="h-4 w-4" />
              <AlertTitle>Budget threshold approaching</AlertTitle>
              <AlertDescription>
                You’re at 85% of your dining budget for this month. Consider scaling back.
              </AlertDescription>
            </Alert>
            <Alert variant="default">
              <TrendingUp className="h-4 w-4" />
              <AlertTitle>New investment match</AlertTitle>
              <AlertDescription>
                Based on your profile, Tech Growth Fund aligns with your risk level.
              </AlertDescription>
            </Alert>
          </CardContent>
          <CardFooter>
            <Button variant="outline" className="w-full">
              Manage alerts
            </Button>
          </CardFooter>
        </Card>
      </div>
    </div>
  );
}
