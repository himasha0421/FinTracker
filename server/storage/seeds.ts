import type {
  InsertAccount,
  InsertFinancialGoal,
  InsertTransaction,
  TransactionAssignmentInput,
  InsertInvestment,
  InsertInvestmentContribution,
} from '@shared/schema';
import type { IStorage } from './types';

const accountSeeds: InsertAccount[] = [
  {
    name: 'Main Savings',
    description: 'Personal savings',
    balance: '8459.45',
    type: 'savings',
    icon: 'wallet',
    color: 'green',
  },
  {
    name: 'Checking Account',
    description: 'Daily expenses',
    balance: '2850.00',
    type: 'checking',
    icon: 'scale',
    color: 'blue',
  },
  {
    name: 'Investment Portfolio',
    description: 'Stocks & ETFs',
    balance: '15230.80',
    type: 'investment',
    icon: 'plus-square',
    color: 'purple',
  },
  {
    name: 'Credit Card',
    description: 'Pending charges',
    balance: '1300.00',
    type: 'credit',
    icon: 'credit-card',
    color: 'red',
  },
  {
    name: 'Savings Account',
    description: 'Emergency fund',
    balance: '3000.00',
    type: 'savings',
    icon: 'wallet',
    color: 'green',
  },
];

type TransactionSeed = {
  transaction: InsertTransaction;
  assignments: TransactionAssignmentInput[];
};

function buildTransactionSeeds(now: Date, accountIds: Record<string, number>): TransactionSeed[] {
  const yesterday = new Date(now);
  yesterday.setDate(yesterday.getDate() - 1);

  return [
    {
      transaction: {
        description: 'Salary Deposit',
        amount: '4500.00',
        date: new Date(now.getFullYear(), now.getMonth(), now.getDate(), 9, 0, 0),
        accountId: accountIds['Main Savings'],
        category: 'Income',
        type: 'income',
        icon: 'briefcase',
      },
      assignments: [{ assignee: 'Hima', sharePercent: '100' }],
    },
    {
      transaction: {
        description: 'Apple Store Purchase',
        amount: '999.00',
        date: new Date(now.getFullYear(), now.getMonth(), now.getDate(), 14, 45, 0),
        accountId: accountIds['Checking Account'],
        category: 'Electronics',
        type: 'expense',
        icon: 'shopping-bag',
      },
      assignments: [
        { assignee: 'Hima', sharePercent: '50' },
        { assignee: 'Thami', sharePercent: '50' },
      ],
    },
    {
      transaction: {
        description: 'Netflix Subscription',
        amount: '15.99',
        date: yesterday,
        accountId: accountIds['Checking Account'],
        category: 'Entertainment',
        type: 'expense',
        icon: 'film',
      },
      assignments: [{ assignee: 'Hima', sharePercent: '100' }],
    },
    {
      transaction: {
        description: 'Superbase Subscription',
        amount: '12.99',
        date: yesterday,
        accountId: accountIds['Checking Account'],
        category: 'Software',
        type: 'expense',
        icon: 'database',
      },
      assignments: [
        { assignee: 'Thami', sharePercent: '60' },
        { assignee: 'Hima', sharePercent: '40' },
      ],
    },
    {
      transaction: {
        description: 'Vercel Subscription',
        amount: '15.99',
        date: yesterday,
        accountId: accountIds['Checking Account'],
        category: 'Software',
        type: 'expense',
        icon: 'server',
      },
      assignments: [{ assignee: 'Thami', sharePercent: '100' }],
    },
    {
      transaction: {
        description: 'Groceries',
        amount: '250.00',
        date: new Date(yesterday.getFullYear(), yesterday.getMonth(), yesterday.getDate(), 17, 30, 0),
        accountId: accountIds['Checking Account'],
        category: 'Food',
        type: 'expense',
        icon: 'shopping-cart',
      },
      assignments: [
        { assignee: 'Hima', sharePercent: '50' },
        { assignee: 'Thami', sharePercent: '50' },
      ],
    },
  ];
}

function buildGoalSeeds(now: Date): InsertFinancialGoal[] {
  const decTarget = new Date(now);
  decTarget.setMonth(11, 31);
  decTarget.setFullYear(now.getFullYear());

  const junTarget = new Date(now);
  junTarget.setMonth(5, 30);
  junTarget.setFullYear(now.getFullYear());

  const marTarget = new Date(now);
  marTarget.setMonth(2, 31);
  marTarget.setFullYear(now.getFullYear() + 1);

  return [
    {
      name: 'Emergency Fund',
      description: '3 months of expenses saved',
      targetAmount: '15000.00',
      currentAmount: '9750.00',
      targetDate: decTarget,
      status: 'in-progress',
      icon: 'shield',
      color: 'blue',
    },
    {
      name: 'Stock Portfolio',
      description: 'Tech sector investment plan',
      targetAmount: '50000.00',
      currentAmount: '15000.00',
      targetDate: junTarget,
      status: 'pending',
      icon: 'trending-up',
      color: 'yellow',
    },
    {
      name: 'Debt Repayment',
      description: 'Student loan payoff plan',
      targetAmount: '25000.00',
      currentAmount: '11250.00',
      targetDate: marTarget,
      status: 'in-progress',
      icon: 'credit-card',
      color: 'blue',
    },
  ];
}

function buildInvestmentSeeds(accountIds: Record<string, number>): InsertInvestment[] {
  const investmentAccountId = accountIds['Investment Portfolio'];

  return [
    {
      name: 'Vanguard S&P 500 ETF',
      type: 'etf',
      accountId: investmentAccountId,
      symbol: 'VOO',
      institution: 'Vanguard',
      currency: 'USD',
      currentValue: '12500.00',
      monthlyContribution: '400.00',
      notes: 'Core index position',
    },
    {
      name: 'Bitcoin',
      type: 'crypto',
      accountId: investmentAccountId,
      symbol: 'BTC',
      institution: 'Coinbase',
      currency: 'USD',
      currentValue: '5200.00',
      monthlyContribution: '100.00',
      notes: 'Long-term allocation',
    },
    {
      name: 'Balanced Mutual Fund',
      type: 'mutual_fund',
      accountId: investmentAccountId,
      symbol: 'VBAL',
      institution: 'Vanguard',
      currency: 'USD',
      currentValue: '8000.00',
      monthlyContribution: '200.00',
      notes: 'Diversified mix',
    },
    {
      name: '1-Year GIC',
      type: 'gic',
      accountId: investmentAccountId,
      institution: 'TD',
      currency: 'USD',
      currentValue: '5000.00',
      monthlyContribution: '0.00',
      notes: 'Fixed income ladder',
    },
  ];
}

function buildInvestmentContributionSeeds(
  now: Date,
  investmentIds: Record<string, number>
): InsertInvestmentContribution[] {
  const makeDate = (monthsAgo: number, day = 5) =>
    new Date(now.getFullYear(), now.getMonth() - monthsAgo, day, 12, 0, 0);

  return [
    {
      investmentId: investmentIds['Vanguard S&P 500 ETF'],
      amount: '400.00',
      date: makeDate(0),
      type: 'contribution',
      notes: 'Monthly auto-buy',
    },
    {
      investmentId: investmentIds['Vanguard S&P 500 ETF'],
      amount: '400.00',
      date: makeDate(1),
      type: 'contribution',
      notes: 'Monthly auto-buy',
    },
    {
      investmentId: investmentIds['Bitcoin'],
      amount: '100.00',
      date: makeDate(0, 12),
      type: 'contribution',
      notes: 'DCA',
    },
    {
      investmentId: investmentIds['Bitcoin'],
      amount: '100.00',
      date: makeDate(1, 12),
      type: 'contribution',
      notes: 'DCA',
    },
    {
      investmentId: investmentIds['Balanced Mutual Fund'],
      amount: '200.00',
      date: makeDate(0, 20),
      type: 'contribution',
      notes: 'Monthly auto-invest',
    },
    {
      investmentId: investmentIds['Balanced Mutual Fund'],
      amount: '200.00',
      date: makeDate(1, 20),
      type: 'contribution',
      notes: 'Monthly auto-invest',
    },
    {
      investmentId: investmentIds['1-Year GIC'],
      amount: '5000.00',
      date: makeDate(4, 10),
      type: 'contribution',
      notes: 'Lump sum deposit',
    },
  ];
}

export async function seedStorage(storage: IStorage, now = new Date()) {
  const accountIdMap: Record<string, number> = {};

  for (const account of accountSeeds) {
    const created = await storage.createAccount(account);
    accountIdMap[account.name] = created.id;
  }

  const transactions = buildTransactionSeeds(now, accountIdMap);
  for (const { transaction, assignments } of transactions) {
    await storage.createTransaction(transaction, assignments);
  }

  const goals = buildGoalSeeds(now);
  for (const goal of goals) {
    await storage.createFinancialGoal(goal);
  }

  const investmentIdMap: Record<string, number> = {};
  const investments = buildInvestmentSeeds(accountIdMap);
  for (const investment of investments) {
    const created = await storage.createInvestment(investment);
    investmentIdMap[investment.name] = created.id;
  }

  const contributions = buildInvestmentContributionSeeds(now, investmentIdMap);
  for (const contribution of contributions) {
    await storage.createInvestmentContribution(contribution);
  }
}
