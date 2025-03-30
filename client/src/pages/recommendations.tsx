import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useQuery } from "@tanstack/react-query";
import { Skeleton } from "@/components/ui/skeleton";
import { AlertCircle, Check, Lightbulb, TrendingUp, DollarSign, Shield, ArrowRight } from "lucide-react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import type { Account, Transaction, FinancialGoal } from "@shared/schema";
import { useFinance } from "@/lib/context";

export default function Recommendations() {
  const { data: accounts, isLoading: isLoadingAccounts } = useQuery({
    queryKey: ['/api/accounts'],
  });
  
  const { data: transactions, isLoading: isLoadingTransactions } = useQuery({
    queryKey: ['/api/transactions'],
  });
  
  const { data: goals, isLoading: isLoadingGoals } = useQuery({
    queryKey: ['/api/goals'],
  });

  const { totalBalance } = useFinance();
  
  const isLoading = isLoadingAccounts || isLoadingTransactions || isLoadingGoals;

  // Function to generate personalized recommendations based on financial data
  const generateRecommendations = (
    accounts: Account[] | undefined,
    transactions: Transaction[] | undefined,
    goals: FinancialGoal[] | undefined,
    totalBalance: number
  ) => {
    const recommendations = [];
    
    // Emergency fund recommendation
    const emergencyFundGoal = goals?.find(goal => 
      goal.name.toLowerCase().includes('emergency') || 
      goal.description?.toLowerCase().includes('emergency')
    );
    
    if (!emergencyFundGoal) {
      recommendations.push({
        title: "Start an Emergency Fund",
        description: "Aim to save 3-6 months of living expenses for unexpected events.",
        icon: <Shield className="h-5 w-5 text-blue-400" />,
        action: "Create Goal",
        priority: "high"
      });
    }
    
    // Spending analysis
    if (transactions && transactions.length > 0) {
      const expenseTransactions = transactions.filter(tx => tx.type === 'expense');
      const subscriptions = expenseTransactions.filter(tx => 
        tx.description.toLowerCase().includes('subscription') || 
        tx.category?.toLowerCase() === 'software' ||
        tx.description.toLowerCase().includes('netflix') ||
        tx.description.toLowerCase().includes('spotify')
      );
      
      if (subscriptions.length >= 3) {
        recommendations.push({
          title: "Review Your Subscriptions",
          description: "You have multiple subscription services. Consider evaluating which ones you truly need.",
          icon: <DollarSign className="h-5 w-5 text-yellow-400" />,
          action: "View Transactions",
          priority: "medium"
        });
      }
      
      // Expense categories analysis
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
      
      const topExpenseCategory = Object.entries(expenseCategories)
        .sort(([, a], [, b]) => b - a)[0];
      
      if (topExpenseCategory) {
        recommendations.push({
          title: `High Spending on ${topExpenseCategory[0]}`,
          description: `Your highest expense category is ${topExpenseCategory[0]}. Look for ways to reduce these expenses.`,
          icon: <AlertCircle className="h-5 w-5 text-red-400" />,
          action: "View Insights",
          priority: "medium"
        });
      }
    }
    
    // Investment recommendation
    const hasInvestments = accounts?.some(account => account.type === 'investment');
    if (!hasInvestments) {
      recommendations.push({
        title: "Start Investing for the Future",
        description: "Consider opening an investment account to grow your wealth over time.",
        icon: <TrendingUp className="h-5 w-5 text-green-400" />,
        action: "Learn More",
        priority: "medium"
      });
    }
    
    // Debt recommendation
    const hasCreditAccount = accounts?.some(account => account.type === 'credit');
    if (hasCreditAccount) {
      recommendations.push({
        title: "Pay Off High-Interest Debt",
        description: "Prioritize paying off credit card balances to avoid high interest charges.",
        icon: <AlertCircle className="h-5 w-5 text-red-400" />,
        action: "Create Plan",
        priority: "high"
      });
    }
    
    // General financial health recommendations
    if (totalBalance > 10000) {
      recommendations.push({
        title: "Consider Tax-Advantaged Accounts",
        description: "Maximize retirement contributions or explore tax-efficient investment options.",
        icon: <Lightbulb className="h-5 w-5 text-yellow-400" />,
        action: "Learn More",
        priority: "low"
      });
    }
    
    return recommendations;
  };

  const recommendations = generateRecommendations(accounts, transactions, goals, totalBalance);
  
  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case "high":
        return "border-red-400/20 bg-red-400/10";
      case "medium":
        return "border-yellow-400/20 bg-yellow-400/10";
      case "low":
        return "border-green-400/20 bg-green-400/10";
      default:
        return "border-blue-400/20 bg-blue-400/10";
    }
  };

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">Financial Recommendations</h1>
      
      {isLoading ? (
        <Alert>
          <Skeleton className="h-4 w-4 mr-2" />
          <Skeleton className="h-4 w-full max-w-md" />
        </Alert>
      ) : (
        <Alert className="bg-blue-500/10 border-blue-500/20">
          <Lightbulb className="h-4 w-4 text-blue-400" />
          <AlertTitle>Personalized Insights</AlertTitle>
          <AlertDescription>
            Based on your financial data, we've generated the following recommendations to help improve your financial health.
          </AlertDescription>
        </Alert>
      )}
      
      <div className="grid gap-6 md:grid-cols-2">
        {isLoading ? (
          Array.from({ length: 4 }).map((_, i) => (
            <Card key={i} className="bg-card">
              <CardHeader className="pb-2">
                <Skeleton className="h-4 w-12 mb-2" />
                <Skeleton className="h-5 w-40" />
              </CardHeader>
              <CardContent>
                <Skeleton className="h-4 w-full mb-2" />
                <Skeleton className="h-4 w-3/4" />
              </CardContent>
              <CardFooter>
                <Skeleton className="h-9 w-24" />
              </CardFooter>
            </Card>
          ))
        ) : recommendations.length > 0 ? (
          recommendations.map((recommendation, index) => (
            <Card key={index} className={`border ${getPriorityColor(recommendation.priority)}`}>
              <CardHeader className="pb-2">
                <CardDescription className="flex items-center">
                  {recommendation.priority === "high" ? (
                    <span className="text-red-400 text-xs font-medium">HIGH PRIORITY</span>
                  ) : recommendation.priority === "medium" ? (
                    <span className="text-yellow-400 text-xs font-medium">MEDIUM PRIORITY</span>
                  ) : (
                    <span className="text-green-400 text-xs font-medium">SUGGESTED</span>
                  )}
                </CardDescription>
                <CardTitle className="flex items-center gap-2">
                  {recommendation.icon}
                  {recommendation.title}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-muted-foreground">
                  {recommendation.description}
                </p>
              </CardContent>
              <CardFooter>
                <Button variant="secondary" size="sm" className="gap-2">
                  {recommendation.action}
                  <ArrowRight className="h-4 w-4" />
                </Button>
              </CardFooter>
            </Card>
          ))
        ) : (
          <Card className="col-span-2">
            <CardContent className="pt-6 pb-6 text-center">
              <Check className="w-12 h-12 text-green-400 mx-auto mb-4" />
              <h3 className="text-xl font-medium mb-2">Your finances look great!</h3>
              <p className="text-muted-foreground">
                Based on your current financial data, we don't have any specific recommendations at this time.
                Continue monitoring your finances regularly.
              </p>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
