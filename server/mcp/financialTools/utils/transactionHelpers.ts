import type { TransactionAssignment, TransactionWithAssignments } from '@shared/schema';
import {
  asDate,
  BreakdownDimension,
  FlowKind,
  inDateRange,
  matchesText,
  normalizeText,
  resolveDateRange,
  toBucket,
  toMonthBucket,
  toNumber,
  TransactionFilters,
  round2,
} from './shared';

type AssignmentShare = {
  assignee: string;
  weight: number;
};

export function signedAmount(transaction: TransactionWithAssignments): number {
  const amount = toNumber(transaction.amount);
  return transaction.type === 'income' ? amount : -amount;
}

export function incomeAmount(transaction: TransactionWithAssignments): number {
  return transaction.type === 'income' ? toNumber(transaction.amount) : 0;
}

export function expenseAmount(transaction: TransactionWithAssignments): number {
  return transaction.type === 'expense' ? toNumber(transaction.amount) : 0;
}

export function normalizeAccountIds(accountIds?: number[]): number[] | undefined {
  if (!accountIds?.length) return undefined;
  const cleaned = Array.from(
    new Set(
      accountIds
        .map(id => Number(id))
        .filter(id => Number.isInteger(id) && id > 0)
    )
  );
  return cleaned.length > 0 ? cleaned : undefined;
}

export function getAssignmentShares(
  assignments: TransactionAssignment[],
  includeUnassigned = true
): AssignmentShare[] {
  if (!assignments.length) {
    return includeUnassigned ? [{ assignee: 'unassigned', weight: 1 }] : [];
  }

  const parsed = assignments
    .map(assignment => ({
      assignee: assignment.assignee?.trim() || 'unknown',
      weight: Math.max(0, toNumber(assignment.sharePercent) / 100),
    }))
    .filter(entry => entry.weight > 0);

  if (!parsed.length) {
    return includeUnassigned ? [{ assignee: 'unassigned', weight: 1 }] : [];
  }

  const totalWeight = parsed.reduce((sum, entry) => sum + entry.weight, 0);
  if (totalWeight <= 0) {
    const equalWeight = 1 / parsed.length;
    return parsed.map(entry => ({ ...entry, weight: equalWeight }));
  }

  return parsed.map(entry => ({
    ...entry,
    weight: entry.weight / totalWeight,
  }));
}

export function getAssigneeWeight(
  transaction: TransactionWithAssignments,
  assignee: string,
  includeUnassigned = true
): number {
  const shares = getAssignmentShares(transaction.assignments ?? [], includeUnassigned);
  const normalized = normalizeText(assignee);
  return shares
    .filter(share => normalizeText(share.assignee) === normalized)
    .reduce((sum, share) => sum + share.weight, 0);
}

export function filterTransactions(
  transactions: TransactionWithAssignments[],
  filters: TransactionFilters,
  includeUnassigned = true
): TransactionWithAssignments[] {
  const range = resolveDateRange(filters.startDate, filters.endDate);
  const accountIds = normalizeAccountIds(filters.accountIds);

  return transactions.filter(transaction => {
    const date = asDate(transaction.date);
    if (!inDateRange(date, range)) return false;

    if (accountIds && !accountIds.includes(transaction.accountId)) return false;
    if (filters.type && transaction.type !== filters.type) return false;

    if (!matchesText(transaction.category ?? undefined, filters.category)) return false;
    if (!matchesText(transaction.subcategory ?? undefined, filters.subcategory)) return false;

    const amount = toNumber(transaction.amount);
    if (filters.minAmount !== undefined && amount < filters.minAmount) return false;
    if (filters.maxAmount !== undefined && amount > filters.maxAmount) return false;

    if (filters.assignee) {
      const assigneeWeight = getAssigneeWeight(transaction, filters.assignee, includeUnassigned);
      if (assigneeWeight <= 0) return false;
    }

    return true;
  });
}

export function sortTransactions(
  transactions: TransactionWithAssignments[],
  direction: 'asc' | 'desc'
): TransactionWithAssignments[] {
  return [...transactions].sort((a, b) => {
    const timeA = asDate(a.date).getTime();
    const timeB = asDate(b.date).getTime();
    return direction === 'asc' ? timeA - timeB : timeB - timeA;
  });
}

function breakdownKey(
  transaction: TransactionWithAssignments,
  dimension: Exclude<BreakdownDimension, 'assignee'>,
  accountNames: Map<number, string>
): string {
  if (dimension === 'category') {
    return transaction.category?.trim() || 'uncategorized';
  }
  if (dimension === 'subcategory') {
    return transaction.subcategory?.trim() || 'uncategorized';
  }
  if (dimension === 'account') {
    return accountNames.get(transaction.accountId) ?? `account:${transaction.accountId}`;
  }
  return toMonthBucket(asDate(transaction.date));
}

export function serializeTransaction(transaction: TransactionWithAssignments) {
  return {
    id: transaction.id,
    description: transaction.description,
    amount: round2(toNumber(transaction.amount)),
    type: transaction.type,
    date: asDate(transaction.date).toISOString(),
    accountId: transaction.accountId,
    category: transaction.category ?? null,
    subcategory: transaction.subcategory ?? null,
    icon: transaction.icon ?? null,
    assignments: (transaction.assignments ?? []).map(assignment => ({
      id: assignment.id,
      assignee: assignment.assignee,
      sharePercent: round2(toNumber(assignment.sharePercent)),
    })),
  };
}

function flowValue(income: number, expense: number, flow: FlowKind): number {
  if (flow === 'income') return income;
  if (flow === 'expense') return expense;
  return income - expense;
}

export function summarizeBreakdown(
  transactions: TransactionWithAssignments[],
  dimension: BreakdownDimension,
  flow: FlowKind,
  accountNames: Map<number, string>,
  assigneeFilter?: string,
  includeUnassigned = true
) {
  const groups = new Map<
    string,
    {
      key: string;
      income: number;
      expense: number;
      net: number;
      txIds: Set<number>;
    }
  >();

  const ensureGroup = (key: string) => {
    const existing = groups.get(key);
    if (existing) return existing;
    const created = { key, income: 0, expense: 0, net: 0, txIds: new Set<number>() };
    groups.set(key, created);
    return created;
  };

  for (const transaction of transactions) {
    const income = incomeAmount(transaction);
    const expense = expenseAmount(transaction);
    const net = signedAmount(transaction);

    if (dimension === 'assignee') {
      const shares = getAssignmentShares(transaction.assignments ?? [], includeUnassigned);
      for (const share of shares) {
        if (assigneeFilter && !matchesText(share.assignee, assigneeFilter)) continue;
        const group = ensureGroup(share.assignee);
        group.income += income * share.weight;
        group.expense += expense * share.weight;
        group.net += net * share.weight;
        group.txIds.add(transaction.id);
      }
      continue;
    }

    let scale = 1;
    if (assigneeFilter) {
      scale = getAssigneeWeight(transaction, assigneeFilter, includeUnassigned);
      if (scale <= 0) continue;
    }

    const key = breakdownKey(transaction, dimension, accountNames);
    const group = ensureGroup(key);
    group.income += income * scale;
    group.expense += expense * scale;
    group.net += net * scale;
    group.txIds.add(transaction.id);
  }

  return Array.from(groups.values())
    .map(group => {
      const normalizedIncome = round2(group.income);
      const normalizedExpense = round2(group.expense);
      const normalizedNet = round2(group.net);
      return {
        key: group.key,
        income: normalizedIncome,
        expense: normalizedExpense,
        net: normalizedNet,
        value: round2(flowValue(normalizedIncome, normalizedExpense, flow)),
        transactionCount: group.txIds.size,
      };
    })
    .sort((a, b) => Math.abs(b.value) - Math.abs(a.value));
}

export function getAssigneeAwareCashflow(
  transaction: TransactionWithAssignments,
  assignee?: string,
  includeUnassigned = true
) {
  const income = incomeAmount(transaction);
  const expense = expenseAmount(transaction);
  const net = signedAmount(transaction);

  if (!assignee) {
    return { income, expense, net };
  }

  const weight = getAssigneeWeight(transaction, assignee, includeUnassigned);
  return {
    income: income * weight,
    expense: expense * weight,
    net: net * weight,
  };
}

export function bucketTransactionsByTime(
  transactions: TransactionWithAssignments[],
  granularity: 'daily' | 'weekly' | 'monthly',
  assignee?: string,
  includeUnassigned = true
) {
  const buckets = new Map<
    string,
    {
      bucket: string;
      income: number;
      expense: number;
      net: number;
      transactionCount: number;
    }
  >();

  for (const transaction of transactions) {
    const date = asDate(transaction.date);
    const bucket = toBucket(date, granularity);
    const existing = buckets.get(bucket) ?? {
      bucket,
      income: 0,
      expense: 0,
      net: 0,
      transactionCount: 0,
    };

    const values = getAssigneeAwareCashflow(transaction, assignee, includeUnassigned);
    existing.income += values.income;
    existing.expense += values.expense;
    existing.net += values.net;
    existing.transactionCount += 1;
    buckets.set(bucket, existing);
  }

  return Array.from(buckets.values())
    .map(point => ({
      bucket: point.bucket,
      income: round2(point.income),
      expense: round2(point.expense),
      net: round2(point.net),
      transactionCount: point.transactionCount,
    }))
    .sort((a, b) => a.bucket.localeCompare(b.bucket));
}
