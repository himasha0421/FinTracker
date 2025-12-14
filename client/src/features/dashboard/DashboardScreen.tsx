import { useEffect } from 'react';
import BalanceSummary from '@/features/dashboard/components/BalanceSummary';
import AccountsCard from '@/features/accounts/components/AccountsCard';
import TransactionsCard from '@/features/transactions/components/TransactionsCard';
import FinancialGoals from '@/features/goals/components/FinancialGoalsSection';
import { useFinance } from '@/lib/context';

export default function DashboardScreen() {
  const { refreshData } = useFinance();

  useEffect(() => {
    refreshData();
  }, []);

  return (
    <div>
      <BalanceSummary />

      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        <AccountsCard />
        <TransactionsCard />
      </div>

      <FinancialGoals />
    </div>
  );
}
