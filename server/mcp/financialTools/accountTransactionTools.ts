import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { storage } from '../../storage';
import {
  bucketTransactionsByTime,
  expenseAmount,
  filterTransactions,
  getAssignmentShares,
  incomeAmount,
  serializeTransaction,
  signedAmount,
  sortTransactions,
  summarizeBreakdown,
} from './utils/transactionHelpers';
import {
  asDate,
  accountNameMap,
  DEFAULT_LIMIT,
  MAX_GROUPS,
  MAX_LIMIT,
  round2,
  toNumber,
  toolError,
  toolResult,
} from './utils/shared';
import {
  accountIdsArg,
  assigneeArg,
  breakdownDimensionArg,
  categoryArg,
  endDateArg,
  flowArg,
  granularityArg,
  includeUnassignedArg,
  limitArg,
  limitGroupsArg,
  maxAmountArg,
  minAmountArg,
  sortDirectionArg,
  startDateArg,
  subcategoryArg,
  transactionTypeArg,
} from './utils/toolDocSchemas';

function getDateBounds(values: Array<Date | string>) {
  if (!values.length) return null;

  let earliest = asDate(values[0]);
  let latest = asDate(values[0]);

  for (const value of values) {
    const date = asDate(value);
    if (date < earliest) earliest = date;
    if (date > latest) latest = date;
  }

  return {
    earliest: earliest.toISOString(),
    latest: latest.toISOString(),
  };
}

export function registerAccountAndTransactionTools(server: McpServer) {
  server.tool(
    'list_accounts',
    'List account IDs and balance context for downstream filtering. Use this to select valid account IDs before running transaction or investment filters.',
    async () => {
      try {
        const accounts = await storage.getAccounts();
        const totalBalance = round2(await storage.getTotalBalance());

        const byType = accounts.reduce<Record<string, { rawTotal: number; netImpact: number }>>(
          (acc, account) => {
            const amount = toNumber(account.balance);
            const netImpact = account.type === 'credit' || account.type === 'loan' ? -amount : amount;
            const existing = acc[account.type] ?? { rawTotal: 0, netImpact: 0 };
            existing.rawTotal += amount;
            existing.netImpact += netImpact;
            acc[account.type] = existing;
            return acc;
          },
          {}
        );

        const formattedByType = Object.entries(byType).map(([type, values]) => ({
          type,
          rawTotal: round2(values.rawTotal),
          netImpact: round2(values.netImpact),
        }));

        return toolResult({
          totalBalance,
          accountCount: accounts.length,
          byType: formattedByType,
          accounts: accounts.map(account => ({
            id: account.id,
            name: account.name,
            type: account.type,
            description: account.description ?? null,
            balance: round2(toNumber(account.balance)),
            netImpact:
              account.type === 'credit' || account.type === 'loan'
                ? round2(-toNumber(account.balance))
                : round2(toNumber(account.balance)),
            icon: account.icon ?? null,
            color: account.color ?? null,
          })),
        });
      } catch (error) {
        return toolError(error);
      }
    }
  );

  server.tool(
    'get_transaction_filter_options',
    'Return valid transaction filter values (assignees, categories, subcategories, account IDs, and date coverage). Call this before text-filtered transaction analysis when values are uncertain.',
    async () => {
      try {
        const [accounts, transactions] = await Promise.all([
          storage.getAccounts(),
          storage.getTransactions(),
        ]);

        const assignees = new Set<string>();
        const categories = new Set<string>();
        const subcategories = new Set<string>();

        for (const transaction of transactions) {
          const category = transaction.category?.trim();
          if (category) categories.add(category);

          const subcategory = transaction.subcategory?.trim();
          if (subcategory) subcategories.add(subcategory);

          const shares = getAssignmentShares(transaction.assignments ?? [], true);
          for (const share of shares) {
            const assignee = share.assignee?.trim();
            if (assignee) assignees.add(assignee);
          }
        }

        const sortedAccounts = accounts
          .map(account => ({
            id: account.id,
            name: account.name,
            type: account.type,
          }))
          .sort((a, b) => a.name.localeCompare(b.name));

        return toolResult({
          guidance: {
            whenToCall:
              'Call this tool before get_transactions, get_transaction_breakdown, or get_cashflow_timeseries if valid filter values are unknown.',
            dateInputs:
              'Use YYYY-MM-DD (recommended) or ISO 8601 timestamps. startDate/endDate are inclusive. Date-only values use UTC start/end of day.',
            textMatching:
              'assignee/category/subcategory filters are case-insensitive exact matches.',
          },
          dateBounds: getDateBounds(transactions.map(transaction => transaction.date)),
          options: {
            accounts: sortedAccounts,
            assignees: Array.from(assignees).sort((a, b) => a.localeCompare(b)),
            categories: Array.from(categories).sort((a, b) => a.localeCompare(b)),
            subcategories: Array.from(subcategories).sort((a, b) => a.localeCompare(b)),
            transactionTypes: ['income', 'expense'],
            sortDirections: ['asc', 'desc'],
            breakdownDimensions: ['assignee', 'category', 'subcategory', 'account', 'month'],
            breakdownFlows: ['income', 'expense', 'net'],
            cashflowGranularities: ['daily', 'weekly', 'monthly'],
          },
          defaults: {
            includeUnassigned: true,
            sort: 'desc',
            breakdownDimension: 'category',
            breakdownFlow: 'expense',
            cashflowGranularity: 'monthly',
            limit: DEFAULT_LIMIT,
            maxLimit: MAX_LIMIT,
            maxGroups: MAX_GROUPS,
          },
          examples: [
            {
              tool: 'get_transactions',
              args: {
                startDate: '2026-01-01',
                endDate: '2026-01-31',
                assignee: 'Hima',
                limit: 100,
              },
            },
            {
              tool: 'get_transaction_breakdown',
              args: {
                startDate: '2026-01-01',
                endDate: '2026-01-31',
                dimension: 'category',
                flow: 'expense',
              },
            },
          ],
        });
      } catch (error) {
        return toolError(error);
      }
    }
  );

  server.tool(
    'get_transactions',
    'Return transaction rows for a scoped period with optional account, assignee, category, subcategory, type, amount, sort, and limit filters. Call get_transaction_filter_options first if filter values are unknown.',
    {
      startDate: startDateArg(),
      endDate: endDateArg(),
      accountIds: accountIdsArg(),
      assignee: assigneeArg(),
      category: categoryArg(),
      subcategory: subcategoryArg(),
      type: transactionTypeArg(),
      minAmount: minAmountArg(),
      maxAmount: maxAmountArg(),
      limit: limitArg(),
      sort: sortDirectionArg(),
    },
    async args => {
      try {
        const allTransactions = await storage.getTransactions();
        const filtered = filterTransactions(allTransactions, args);
        const sortDirection = args.sort ?? 'desc';
        const ordered = sortTransactions(filtered, sortDirection);
        const limit = Math.min(args.limit ?? DEFAULT_LIMIT, MAX_LIMIT);
        const transactions = ordered.slice(0, limit);

        const totals = transactions.reduce(
          (acc, transaction) => {
            acc.income += incomeAmount(transaction);
            acc.expense += expenseAmount(transaction);
            acc.net += signedAmount(transaction);
            return acc;
          },
          { income: 0, expense: 0, net: 0 }
        );

        return toolResult({
          filters: {
            startDate: args.startDate ?? null,
            endDate: args.endDate ?? null,
            accountIds: args.accountIds ?? null,
            assignee: args.assignee ?? null,
            category: args.category ?? null,
            subcategory: args.subcategory ?? null,
            type: args.type ?? null,
            minAmount: args.minAmount ?? null,
            maxAmount: args.maxAmount ?? null,
          },
          totalMatching: filtered.length,
          returned: transactions.length,
          sort: sortDirection,
          totals: {
            income: round2(totals.income),
            expense: round2(totals.expense),
            net: round2(totals.net),
          },
          transactions: transactions.map(serializeTransaction),
        });
      } catch (error) {
        return toolError(error);
      }
    }
  );

  server.tool(
    'get_transaction_breakdown',
    'Aggregate transaction totals by assignee, category, subcategory, account, or month over a scoped period. Supports assignee-aware weighting and flow selection (income, expense, net).',
    {
      startDate: startDateArg(),
      endDate: endDateArg(),
      accountIds: accountIdsArg(),
      assignee: assigneeArg(),
      category: categoryArg(),
      subcategory: subcategoryArg(),
      type: transactionTypeArg(),
      minAmount: minAmountArg(),
      maxAmount: maxAmountArg(),
      flow: flowArg(),
      dimension: breakdownDimensionArg(),
      includeUnassigned: includeUnassignedArg(),
      limitGroups: limitGroupsArg(),
    },
    async args => {
      try {
        const includeUnassigned = args.includeUnassigned ?? true;
        const dimension = args.dimension ?? 'category';
        const flow = args.flow ?? 'expense';

        const [accounts, allTransactions] = await Promise.all([
          storage.getAccounts(),
          storage.getTransactions(),
        ]);

        const filtered = filterTransactions(
          allTransactions,
          {
            startDate: args.startDate,
            endDate: args.endDate,
            accountIds: args.accountIds,
            assignee: args.assignee,
            category: args.category,
            subcategory: args.subcategory,
            type: args.type,
            minAmount: args.minAmount,
            maxAmount: args.maxAmount,
          },
          includeUnassigned
        );

        const groups = summarizeBreakdown(
          filtered,
          dimension,
          flow,
          accountNameMap(accounts),
          args.assignee,
          includeUnassigned
        ).slice(0, args.limitGroups ?? MAX_GROUPS);

        return toolResult({
          dimension,
          flow,
          includeUnassigned,
          matchingTransactions: filtered.length,
          groups,
        });
      } catch (error) {
        return toolError(error);
      }
    }
  );

  server.tool(
    'get_cashflow_timeseries',
    'Return time-bucketed income, expense, and net cashflow (daily, weekly, or monthly) for a filtered transaction slice.',
    {
      startDate: startDateArg(),
      endDate: endDateArg(),
      granularity: granularityArg(),
      accountIds: accountIdsArg(),
      assignee: assigneeArg(),
      category: categoryArg(),
      subcategory: subcategoryArg(),
      type: transactionTypeArg(),
      includeUnassigned: includeUnassignedArg(),
    },
    async args => {
      try {
        const granularity = args.granularity ?? 'monthly';
        const includeUnassigned = args.includeUnassigned ?? true;
        const transactions = await storage.getTransactions();
        const filtered = filterTransactions(
          transactions,
          {
            startDate: args.startDate,
            endDate: args.endDate,
            accountIds: args.accountIds,
            category: args.category,
            subcategory: args.subcategory,
            type: args.type,
            assignee: args.assignee,
          },
          includeUnassigned
        );

        const points = bucketTransactionsByTime(
          filtered,
          granularity,
          args.assignee,
          includeUnassigned
        );

        return toolResult({
          granularity,
          matchingTransactions: filtered.length,
          points,
        });
      } catch (error) {
        return toolError(error);
      }
    }
  );
}
