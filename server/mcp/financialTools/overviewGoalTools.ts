import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { storage } from '../../storage';
import { goalProgress } from './utils/goalHelpers';
import {
  accountNameMap,
  round2,
  toNumber,
  toolError,
  toolResult,
} from './utils/shared';
import {
  filterTransactions,
  getAssigneeAwareCashflow,
  summarizeBreakdown,
} from './utils/transactionHelpers';
import {
  assigneeArg,
  endDateArg,
  goalStatusArg,
  includeCompletedArg,
  includeUnassignedArg,
  startDateArg,
} from './utils/toolDocSchemas';

export function registerOverviewAndGoalTools(server: McpServer) {
  server.tool(
    'get_financial_overview',
    'Return a consolidated financial snapshot for a period: account balances, assignee-aware cashflow, top expense categories, assignee spend, goals, and investments. Use get_transaction_filter_options first when assignee values are unknown.',
    {
      startDate: startDateArg(),
      endDate: endDateArg(),
      assignee: assigneeArg(),
      includeUnassigned: includeUnassignedArg(),
    },
    async args => {
      try {
        const includeUnassigned = args.includeUnassigned ?? true;
        const [accounts, goals, investments, transactions, totalBalance] = await Promise.all([
          storage.getAccounts(),
          storage.getFinancialGoals(),
          storage.getInvestments(),
          storage.getTransactions(),
          storage.getTotalBalance(),
        ]);

        const filteredTransactions = filterTransactions(
          transactions,
          {
            startDate: args.startDate,
            endDate: args.endDate,
            assignee: args.assignee,
          },
          includeUnassigned
        );

        const cashflow = filteredTransactions.reduce(
          (acc, transaction) => {
            const values = getAssigneeAwareCashflow(transaction, args.assignee, includeUnassigned);
            acc.income += values.income;
            acc.expense += values.expense;
            acc.net += values.net;
            return acc;
          },
          { income: 0, expense: 0, net: 0 }
        );

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

        const topExpenseCategories = summarizeBreakdown(
          filteredTransactions,
          'category',
          'expense',
          accountNameMap(accounts),
          args.assignee,
          includeUnassigned
        ).slice(0, 10);

        const assigneeSpend = summarizeBreakdown(
          filteredTransactions,
          'assignee',
          'expense',
          accountNameMap(accounts),
          undefined,
          includeUnassigned
        ).slice(0, 10);

        const goalRows = goals.map(goalProgress);
        const totalGoalTarget = round2(goalRows.reduce((sum, row) => sum + row.targetAmount, 0));
        const totalGoalCurrent = round2(goalRows.reduce((sum, row) => sum + row.currentAmount, 0));

        const investmentMarketValue = round2(
          investments.reduce((sum, investment) => sum + toNumber(investment.currentValue), 0)
        );
        const investmentMonthlyContribution = round2(
          investments.reduce((sum, investment) => sum + toNumber(investment.monthlyContribution), 0)
        );

        return toolResult({
          period: {
            startDate: args.startDate ?? null,
            endDate: args.endDate ?? null,
            assignee: args.assignee ?? null,
          },
          accountNetBalance: round2(totalBalance),
          accountsByType: Object.entries(byType).map(([type, values]) => ({
            type,
            rawTotal: round2(values.rawTotal),
            netImpact: round2(values.netImpact),
          })),
          periodCashflow: {
            income: round2(cashflow.income),
            expense: round2(cashflow.expense),
            net: round2(cashflow.net),
            transactionCount: filteredTransactions.length,
          },
          topExpenseCategories,
          assigneeSpend,
          goals: {
            totalTargetAmount: totalGoalTarget,
            totalCurrentAmount: totalGoalCurrent,
            progressPercent:
              totalGoalTarget > 0 ? round2((totalGoalCurrent / totalGoalTarget) * 100) : 0,
            items: goalRows,
          },
          investments: {
            count: investments.length,
            totalMarketValue: investmentMarketValue,
            totalMonthlyContribution: investmentMonthlyContribution,
          },
        });
      } catch (error) {
        return toolError(error);
      }
    }
  );

  server.tool(
    'get_goal_progress',
    'List goals with progress metrics and days remaining, with optional filtering by completion state or status.',
    {
      includeCompleted: includeCompletedArg(),
      status: goalStatusArg(),
    },
    async args => {
      try {
        const includeCompleted = args.includeCompleted ?? true;
        const goals = await storage.getFinancialGoals();

        const goalRows = goals
          .map(goalProgress)
          .filter(goal => (includeCompleted ? true : goal.status !== 'completed'))
          .filter(goal => (args.status ? goal.status === args.status : true))
          .sort((a, b) => new Date(a.targetDate).getTime() - new Date(b.targetDate).getTime());

        const totals = goalRows.reduce(
          (acc, goal) => {
            acc.targetAmount += goal.targetAmount;
            acc.currentAmount += goal.currentAmount;
            return acc;
          },
          { targetAmount: 0, currentAmount: 0 }
        );

        return toolResult({
          goalCount: goalRows.length,
          totalTargetAmount: round2(totals.targetAmount),
          totalCurrentAmount: round2(totals.currentAmount),
          overallProgressPercent:
            totals.targetAmount > 0 ? round2((totals.currentAmount / totals.targetAmount) * 100) : 0,
          goals: goalRows,
        });
      } catch (error) {
        return toolError(error);
      }
    }
  );
}
