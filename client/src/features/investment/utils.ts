import type { InvestmentContributionItem, InvestmentItem } from '@/features/investment/types';

export const allocationPalette = [
  '#22c55e',
  '#3b82f6',
  '#f59e0b',
  '#a855f7',
  '#ef4444',
  '#14b8a6',
  '#eab308',
];

export const formatTypeLabel = (value: string) =>
  value
    .split('_')
    .map(part => part.charAt(0).toUpperCase() + part.slice(1))
    .join(' ');

export const formatCurrency = (value: number, currency = 'USD') => {
  try {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency,
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(value);
  } catch {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(value);
  }
};

export const getSignedContributionAmount = (contribution: InvestmentContributionItem) =>
  contribution.type === 'withdrawal' ? -Number(contribution.amount) : Number(contribution.amount);

export const buildMonthlyContributionSeries = (
  contributions: InvestmentContributionItem[],
  months = 12
) => {
  const totals = new Map<string, number>();
  contributions.forEach(contribution => {
    const date = new Date(contribution.date);
    const key = `${date.getFullYear()}-${date.getMonth()}`;
    const signedAmount = getSignedContributionAmount(contribution);
    totals.set(key, (totals.get(key) ?? 0) + signedAmount);
  });

  const now = new Date();
  const points: { month: string; value: number }[] = [];
  for (let i = months - 1; i >= 0; i -= 1) {
    const date = new Date(now.getFullYear(), now.getMonth() - i, 1);
    const key = `${date.getFullYear()}-${date.getMonth()}`;
    points.push({
      month: date.toLocaleString('en-US', { month: 'short' }),
      value: Number((totals.get(key) ?? 0).toFixed(2)),
    });
  }
  return points;
};

export const buildAllocationSlices = (investments: InvestmentItem[]) => {
  const totals = new Map<
    string,
    {
      type: string;
      name: string;
      value: number;
      count: number;
      monthlyContribution: number;
      items: InvestmentItem[];
    }
  >();

  investments.forEach(investment => {
    const existing = totals.get(investment.type);
    const value = Number(investment.currentValue || 0);
    const monthlyContribution = Number(investment.monthlyContribution || 0);

    if (existing) {
      existing.value += value;
      existing.count += 1;
      existing.monthlyContribution += monthlyContribution;
      existing.items.push(investment);
      return;
    }

    totals.set(investment.type, {
      type: investment.type,
      name: formatTypeLabel(investment.type),
      value,
      count: 1,
      monthlyContribution,
      items: [investment],
    });
  });

  return Array.from(totals.values())
    .sort((left, right) => {
      if (right.value !== left.value) {
        return right.value - left.value;
      }

      if (right.monthlyContribution !== left.monthlyContribution) {
        return right.monthlyContribution - left.monthlyContribution;
      }

      return left.name.localeCompare(right.name);
    })
    .map((item, index) => ({
      ...item,
      color: allocationPalette[index % allocationPalette.length],
      items: [...item.items].sort(
        (left, right) => Number(right.currentValue || 0) - Number(left.currentValue || 0)
      ),
    }));
};
