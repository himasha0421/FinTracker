import { useMemo, useCallback } from 'react';
import type { DateRange } from 'react-day-picker';
import type { TransactionWithAssignments } from '@/features/transactions/types';

type WeeklySegment = { start: Date; end: Date; label: string };

type UseInsightsDataResult = {
  summaryData: { income: number; expense: number; savings: number };
  weeklyData: Record<string, any>[];
  weeklyCategories: string[];
  getTransactionsForWeek: (index: number) => TransactionWithAssignments[];
  assigneeDistributionData: { name: string; value: number }[];
  categoriesByAssignee: Record<string, { name: string; value: number }[]>;
  assigneeCategoryTransactions: Record<
    string,
    Record<
      string,
      { transaction: TransactionWithAssignments; shareAmount: number; sharePercent: number }[]
    >
  >;
  totalAssigneeExpenses: number;
};

export function normalizeDateRange(range: DateRange | undefined): { from: Date; to: Date } {
  if (range?.from && range?.to) {
    const from = new Date(range.from);
    from.setHours(0, 0, 0, 0);
    const to = new Date(range.to);
    to.setHours(23, 59, 59, 999);
    return { from, to };
  }
  if (range?.from) {
    const single = new Date(range.from);
    const from = new Date(single);
    from.setHours(0, 0, 0, 0);
    const to = new Date(single);
    to.setHours(23, 59, 59, 999);
    return { from, to };
  }
  const to = new Date();
  to.setHours(23, 59, 59, 999);
  const from = new Date();
  from.setDate(to.getDate() - 30);
  from.setHours(0, 0, 0, 0);
  return { from, to };
}

const buildWeeklySegments = (range: { from: Date; to: Date }): WeeklySegment[] => {
  const segments: WeeklySegment[] = [];
  let cursor = new Date(range.from);
  while (cursor <= range.to) {
    const segmentStart = new Date(cursor);
    const segmentEnd = new Date(cursor);
    segmentEnd.setDate(segmentEnd.getDate() + 6);
    if (segmentEnd > range.to) segmentEnd.setTime(range.to.getTime());
    segments.push({ start: segmentStart, end: segmentEnd, label: `Week ${segments.length + 1}` });
    cursor = new Date(segmentEnd);
    cursor.setDate(cursor.getDate() + 1);
  }
  return segments;
};

export function useInsightsData(
  transactions: TransactionWithAssignments[] | undefined,
  dateRange: DateRange | undefined
): UseInsightsDataResult {
  const normalizedRange = useMemo(() => normalizeDateRange(dateRange), [dateRange]);

  const dateFilteredTransactions = useMemo(() => {
    if (!transactions) return [] as TransactionWithAssignments[];
    return transactions.filter(transaction => {
      const txDate = new Date(transaction.date);
      return txDate >= normalizedRange.from && txDate <= normalizedRange.to;
    });
  }, [transactions, normalizedRange]);

  const summaryData = useMemo(() => {
    return dateFilteredTransactions.reduce(
      (acc, transaction) => {
        const amount = Number(transaction.amount);
        if (transaction.type === 'income') {
          acc.income += amount;
        } else {
          acc.expense += amount;
        }
        acc.savings = acc.income - acc.expense;
        return acc;
      },
      { income: 0, expense: 0, savings: 0 }
    );
  }, [dateFilteredTransactions]);

  const weeklyComputation = useMemo(() => {
    const segments = buildWeeklySegments(normalizedRange);
    const uniqueCategories = new Set<string>();
    dateFilteredTransactions.forEach(t => {
      if (t.type === 'expense' && t.category) uniqueCategories.add(t.category);
    });

    const weeklyData = segments.map(segment => {
      const weekTransactions = dateFilteredTransactions.filter(t => {
        const date = new Date(t.date);
        return date >= segment.start && date <= segment.end;
      });
      const entry: Record<string, any> = { week: segment.label, _hasTransactions: weekTransactions.length > 0 };
      uniqueCategories.forEach(category => {
        entry[category] = 0;
      });
      weekTransactions.forEach(t => {
        if (t.type === 'expense' && t.category) {
          entry[t.category] = (entry[t.category] || 0) + Number(t.amount);
        }
      });
      return entry;
    });

    return { weeklyData, weeklySegments: segments, categories: Array.from(uniqueCategories) };
  }, [dateFilteredTransactions, normalizedRange]);

  const getTransactionsForWeek = useCallback(
    (index: number) => {
      const segment = weeklyComputation.weeklySegments[index];
      if (!segment) return [] as TransactionWithAssignments[];
      return dateFilteredTransactions.filter(transaction => {
        const date = new Date(transaction.date);
        return date >= segment.start && date <= segment.end;
      });
    },
    [weeklyComputation.weeklySegments, dateFilteredTransactions]
  );

  const assigneeBreakdown = useMemo(() => {
    const expenses = dateFilteredTransactions.filter(tx => tx.type === 'expense');
    const totals: Record<string, number> = {};
    const breakdown: Record<string, Record<string, number>> = {};
    const transactionsByAssignee: Record<
      string,
      Record<
        string,
        { transaction: TransactionWithAssignments; shareAmount: number; sharePercent: number }[]
      >
    > = {};

    expenses.forEach(transaction => {
      const category = transaction.category || 'Uncategorized';
      const amount = Number(transaction.amount);
      if (!transaction.assignments || transaction.assignments.length === 0) {
        totals.Unassigned = (totals.Unassigned || 0) + amount;
        breakdown.Unassigned = breakdown.Unassigned || {};
        breakdown.Unassigned[category] = (breakdown.Unassigned[category] || 0) + amount;
        transactionsByAssignee.Unassigned = transactionsByAssignee.Unassigned || {};
        transactionsByAssignee.Unassigned[category] =
          transactionsByAssignee.Unassigned[category] || [];
        transactionsByAssignee.Unassigned[category].push({
          transaction,
          shareAmount: Number(amount.toFixed(2)),
          sharePercent: 100,
        });
        return;
      }
      transaction.assignments.forEach(assignment => {
        const percent = Number(assignment.sharePercent) || 0;
        if (percent <= 0) return;
        const shareAmount = (amount * percent) / 100;
        totals[assignment.assignee] = (totals[assignment.assignee] || 0) + shareAmount;
        breakdown[assignment.assignee] = breakdown[assignment.assignee] || {};
        breakdown[assignment.assignee][category] =
          (breakdown[assignment.assignee][category] || 0) + shareAmount;
        transactionsByAssignee[assignment.assignee] =
          transactionsByAssignee[assignment.assignee] || {};
        transactionsByAssignee[assignment.assignee][category] =
          transactionsByAssignee[assignment.assignee][category] || [];
        transactionsByAssignee[assignment.assignee][category].push({
          transaction,
          shareAmount: Number(shareAmount.toFixed(2)),
          sharePercent: percent,
        });
      });
    });

    const totalsArray = Object.entries(totals).map(([name, value]) => ({
      name,
      value: Number(value.toFixed(2)),
    }));

    const categoriesByAssignee: Record<string, { name: string; value: number }[]> = {};
    Object.entries(breakdown).forEach(([assignee, categories]) => {
      categoriesByAssignee[assignee] = Object.entries(categories)
        .filter(([, value]) => value > 0)
        .map(([categoryName, value]) => ({ name: categoryName, value: Number(value.toFixed(2)) }))
        .sort((a, b) => b.value - a.value);
    });

    const totalAssigneeExpenses = totalsArray.reduce((sum, entry) => sum + entry.value, 0);

    return { totalsArray, categoriesByAssignee, totalAssigneeExpenses, transactionsByAssignee };
  }, [dateFilteredTransactions]);

  return {
    summaryData,
    weeklyData: weeklyComputation.weeklyData,
    weeklyCategories: weeklyComputation.categories,
    getTransactionsForWeek,
    assigneeDistributionData: assigneeBreakdown.totalsArray,
    categoriesByAssignee: assigneeBreakdown.categoriesByAssignee,
    assigneeCategoryTransactions: assigneeBreakdown.transactionsByAssignee,
    totalAssigneeExpenses: assigneeBreakdown.totalAssigneeExpenses,
  };
}
