import { useEffect } from 'react';
import BalanceSummary from '@/components/dashboard/balance-summary';
import AccountsCard from '@/components/dashboard/accounts-card';
import TransactionsCard from '@/components/dashboard/transactions-card';
import FinancialGoals from '@/components/dashboard/financial-goals';
import { useFinance } from '@/lib/context';

export default function Dashboard() {
  const { refreshData } = useFinance();

  // Refresh data when dashboard loads
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
