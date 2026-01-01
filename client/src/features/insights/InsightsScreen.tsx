import { useState } from 'react';
import type { DateRange } from 'react-day-picker';
import { useQuery } from '@tanstack/react-query';
import { transactionsListQuery } from '@/features/transactions/api';
import DateRangeSelector from '@/features/insights/components/DateRangeSelector';
import SummaryCard from '@/features/insights/components/SummaryCard';
import WeeklySpendCard from '@/features/insights/components/WeeklySpendCard';
import AssigneeDistributionCard from '@/features/insights/components/AssigneeDistributionCard';
import MonthlyCategorySpendCard from '@/features/insights/components/MonthlyCategorySpendCard';
import { useInsightsData } from '@/features/insights/hooks/useInsightsData';
import { useCategoryBudgets } from '@/features/budgets/hooks/useCategoryBudgets';

export default function InsightsScreen() {
  const [dateRange, setDateRange] = useState<DateRange | undefined>(() => {
    const to = new Date();
    const from = new Date();
    from.setDate(to.getDate() - 30);
    return { from, to };
  });

  const { data: transactions, isLoading } = useQuery({
    ...transactionsListQuery(),
    staleTime: 30000,
    refetchOnMount: true,
    refetchOnWindowFocus: true,
  });

  const {
    summaryData,
    weeklyData,
    weeklyCategories,
    getTransactionsForWeek,
    monthlyData,
    monthlyCategories,
    monthlyTotalsByCategory,
    assigneeDistributionData,
    categoriesByAssignee,
    assigneeCategoryTransactions,
    totalAssigneeExpenses,
  } = useInsightsData(transactions, dateRange);

  const { budgetMap } = useCategoryBudgets(monthlyCategories);

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="text-2xl font-bold">Spending Insights</h1>
          <p className="text-muted-foreground">
            Track your income, expenses, and savings with customizable breakdowns.
          </p>
        </div>
        <DateRangeSelector dateRange={dateRange} onChange={setDateRange} />
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <SummaryCard data={summaryData} isLoading={isLoading} />
        <WeeklySpendCard
          weeklyData={weeklyData}
          categories={weeklyCategories}
          isLoading={isLoading}
          getTransactionsForWeek={getTransactionsForWeek}
        />
      </div>

      <AssigneeDistributionCard
        isLoading={isLoading}
        distribution={assigneeDistributionData}
        categoriesByAssignee={categoriesByAssignee}
        categoryTransactions={assigneeCategoryTransactions}
        total={totalAssigneeExpenses}
      />

      <MonthlyCategorySpendCard
        monthlyData={monthlyData}
        categories={monthlyCategories}
        isLoading={isLoading}
        budgetMap={budgetMap}
        monthlyTotalsByCategory={monthlyTotalsByCategory}
      />
    </div>
  );
}
