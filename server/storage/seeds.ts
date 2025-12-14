import type { InsertAccount, InsertFinancialGoal, InsertTransaction } from '@shared/schema';
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

function buildTransactionSeeds(now: Date, accountIds: Record<string, number>): InsertTransaction[] {
  const yesterday = new Date(now);
  yesterday.setDate(yesterday.getDate() - 1);

  return [
    {
      description: 'Salary Deposit',
      amount: '4500.00',
      date: new Date(now.getFullYear(), now.getMonth(), now.getDate(), 9, 0, 0),
      accountId: accountIds['Main Savings'],
      category: 'Income',
      type: 'income',
      icon: 'briefcase',
    },
    {
      description: 'Apple Store Purchase',
      amount: '999.00',
      date: new Date(now.getFullYear(), now.getMonth(), now.getDate(), 14, 45, 0),
      accountId: accountIds['Checking Account'],
      category: 'Electronics',
      type: 'expense',
      icon: 'shopping-bag',
    },
    {
      description: 'Netflix Subscription',
      amount: '15.99',
      date: yesterday,
      accountId: accountIds['Checking Account'],
      category: 'Entertainment',
      type: 'expense',
      icon: 'film',
    },
    {
      description: 'Superbase Subscription',
      amount: '12.99',
      date: yesterday,
      accountId: accountIds['Checking Account'],
      category: 'Software',
      type: 'expense',
      icon: 'database',
    },
    {
      description: 'Vercel Subscription',
      amount: '15.99',
      date: yesterday,
      accountId: accountIds['Checking Account'],
      category: 'Software',
      type: 'expense',
      icon: 'server',
    },
    {
      description: 'Groceries',
      amount: '250.00',
      date: new Date(yesterday.getFullYear(), yesterday.getMonth(), yesterday.getDate(), 17, 30, 0),
      accountId: accountIds['Checking Account'],
      category: 'Food',
      type: 'expense',
      icon: 'shopping-cart',
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

export async function seedStorage(storage: IStorage, now = new Date()) {
  const accountIdMap: Record<string, number> = {};

  for (const account of accountSeeds) {
    const created = await storage.createAccount(account);
    accountIdMap[account.name] = created.id;
  }

  const transactions = buildTransactionSeeds(now, accountIdMap);
  for (const transaction of transactions) {
    await storage.createTransaction(transaction);
  }

  const goals = buildGoalSeeds(now);
  for (const goal of goals) {
    await storage.createFinancialGoal(goal);
  }
}
