import type { Investment, InvestmentContribution } from '@shared/schema';
import {
  asDate,
  DateRange,
  DEFAULT_INVESTMENT_CONTRIBUTION_MONTHS,
  formatTypeLabel,
  inDateRange,
  isAssetType,
  MAX_CONTRIBUTION_MONTHS,
  round2,
  toNumber,
  resolveDateRange,
  isContributionAssetType,
  InvestmentContributionType,
} from './shared';

export type ContributionStats = {
  net: number;
  contributionTotal: number;
  withdrawalTotal: number;
  count: number;
};

export function signedContributionAmount(contribution: InvestmentContribution): number {
  const amount = toNumber(contribution.amount);
  return contribution.type === 'withdrawal' ? -amount : amount;
}

export function filterContributions(
  contributions: InvestmentContribution[],
  options: {
    startDate?: string;
    endDate?: string;
    investmentId?: number;
    type?: InvestmentContributionType;
  }
): InvestmentContribution[] {
  const range = resolveDateRange(options.startDate, options.endDate);
  return contributions.filter(contribution => {
    if (options.investmentId !== undefined && contribution.investmentId !== options.investmentId) {
      return false;
    }
    if (options.type && contribution.type !== options.type) {
      return false;
    }
    return inDateRange(asDate(contribution.date), range);
  });
}

export function filterContributionsByRange(
  contributions: InvestmentContribution[],
  range: DateRange,
  investmentId?: number
) {
  return contributions.filter(contribution => {
    if (investmentId && contribution.investmentId !== investmentId) return false;
    return inDateRange(asDate(contribution.date), range);
  });
}

export function contributionsByInvestment(contributions: InvestmentContribution[]): Map<number, ContributionStats> {
  const map = new Map<number, ContributionStats>();

  for (const contribution of contributions) {
    const existing = map.get(contribution.investmentId) ?? {
      net: 0,
      contributionTotal: 0,
      withdrawalTotal: 0,
      count: 0,
    };
    const amount = toNumber(contribution.amount);
    if (contribution.type === 'withdrawal') {
      existing.withdrawalTotal += amount;
      existing.net -= amount;
    } else {
      existing.contributionTotal += amount;
      existing.net += amount;
    }
    existing.count += 1;
    map.set(contribution.investmentId, existing);
  }

  return map;
}

export function toContributionMonthSeries(
  contributions: InvestmentContribution[],
  months = DEFAULT_INVESTMENT_CONTRIBUTION_MONTHS
) {
  const normalizedMonths = Math.min(Math.max(months, 1), MAX_CONTRIBUTION_MONTHS);
  const totals = new Map<string, number>();
  for (const contribution of contributions) {
    const date = asDate(contribution.date);
    const key = `${date.getUTCFullYear()}-${String(date.getUTCMonth() + 1).padStart(2, '0')}`;
    totals.set(key, (totals.get(key) ?? 0) + signedContributionAmount(contribution));
  }

  const now = new Date();
  const points: { month: string; value: number }[] = [];
  for (let i = normalizedMonths - 1; i >= 0; i -= 1) {
    const date = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() - i, 1));
    const key = `${date.getUTCFullYear()}-${String(date.getUTCMonth() + 1).padStart(2, '0')}`;
    points.push({
      month: key,
      value: round2(totals.get(key) ?? 0),
    });
  }

  return points;
}

export function serializeInvestmentBase(
  investment: Investment,
  accountNames: Map<number, string>,
  contributionStats?: ContributionStats
) {
  const currentValue = round2(toNumber(investment.currentValue));
  const monthlyContribution = round2(toNumber(investment.monthlyContribution));
  const contributionTotal = round2(contributionStats?.contributionTotal ?? 0);
  const withdrawalTotal = round2(contributionStats?.withdrawalTotal ?? 0);
  const netContributions = round2(contributionStats?.net ?? 0);
  const gainLossAgainstContributions = round2(currentValue - netContributions);
  const gainLossPercent =
    netContributions > 0 ? round2((gainLossAgainstContributions / netContributions) * 100) : null;

  return {
    id: investment.id,
    name: investment.name,
    type: investment.type,
    typeLabel: formatTypeLabel(investment.type),
    class: isAssetType(investment.type) ? 'asset' : 'holding',
    symbol: investment.symbol ?? null,
    institution: investment.institution ?? null,
    currency: investment.currency,
    accountId: investment.accountId ?? null,
    linkedAccount: investment.accountId ? accountNames.get(investment.accountId) ?? null : null,
    currentValue,
    monthlyContribution,
    contributionTotal,
    withdrawalTotal,
    netContributions,
    gainLossAgainstContributions,
    gainLossPercent,
    contributionCount: contributionStats?.count ?? 0,
    notes: investment.notes ?? null,
  };
}

export function getInvestmentMetrics(investment: Investment, contributions: InvestmentContribution[]) {
  const investmentContributions = contributions.filter(
    contribution => contribution.investmentId === investment.id
  );

  let contributionTotal = 0;
  let withdrawalTotal = 0;
  for (const entry of investmentContributions) {
    const amount = toNumber(entry.amount);
    if (entry.type === 'withdrawal') {
      withdrawalTotal += amount;
    } else {
      contributionTotal += amount;
    }
  }

  return {
    id: investment.id,
    name: investment.name,
    type: investment.type,
    symbol: investment.symbol ?? null,
    institution: investment.institution ?? null,
    currency: investment.currency,
    currentValue: round2(toNumber(investment.currentValue)),
    monthlyContribution: round2(toNumber(investment.monthlyContribution)),
    contributionTotal: round2(contributionTotal),
    withdrawalTotal: round2(withdrawalTotal),
    netContributions: round2(contributionTotal - withdrawalTotal),
    contributionCount: investmentContributions.length,
  };
}

export function splitAssetAndHoldingContributions(rows: Array<{ type: string; monthlyContribution: number }>) {
  const monthlyContributionAssets = round2(
    rows.reduce((sum, investment) => {
      return isContributionAssetType(investment.type) ? sum + investment.monthlyContribution : sum;
    }, 0)
  );

  return {
    monthlyContributionAssets,
    monthlyContributionHoldings: round2(
      rows.reduce((sum, investment) => sum + investment.monthlyContribution, 0) -
        monthlyContributionAssets
    ),
  };
}
