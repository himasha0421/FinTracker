import {
  Account,
  InsertAccount,
  Transaction,
  InsertTransaction,
  FinancialGoal,
  InsertFinancialGoal,
  User,
  InsertUser,
} from '@shared/schema';
import { IStorage } from './types';

export class MemoryStorage implements IStorage {
  private users: Map<number, User>;
  private accounts: Map<number, Account>;
  private transactions: Map<number, Transaction>;
  private financialGoals: Map<number, FinancialGoal>;

  private userCurrentId: number;
  private accountCurrentId: number;
  private transactionCurrentId: number;
  private goalCurrentId: number;

  constructor() {
    this.users = new Map();
    this.accounts = new Map();
    this.transactions = new Map();
    this.financialGoals = new Map();

    this.userCurrentId = 1;
    this.accountCurrentId = 1;
    this.transactionCurrentId = 1;
    this.goalCurrentId = 1;
  }

  async getUser(id: number): Promise<User | undefined> {
    return this.users.get(id);
  }

  async getUserByUsername(username: string): Promise<User | undefined> {
    return Array.from(this.users.values()).find(user => user.username === username);
  }

  async createUser(insertUser: InsertUser): Promise<User> {
    const id = this.userCurrentId++;
    const user: User = { ...insertUser, id };
    this.users.set(id, user);
    return user;
  }

  async getAccounts(): Promise<Account[]> {
    return Array.from(this.accounts.values());
  }

  async getAccount(id: number): Promise<Account | undefined> {
    return this.accounts.get(id);
  }

  async createAccount(insertAccount: InsertAccount): Promise<Account> {
    const id = this.accountCurrentId++;
    const account: Account = {
      ...insertAccount,
      id,
      description: insertAccount.description || null,
      balance: insertAccount.balance || '0',
      icon: insertAccount.icon || 'wallet',
      color: insertAccount.color || 'green',
    };
    this.accounts.set(id, account);
    return account;
  }

  async updateAccount(
    id: number,
    accountData: Partial<InsertAccount>
  ): Promise<Account | undefined> {
    const account = this.accounts.get(id);
    if (!account) return undefined;

    const updatedAccount = { ...account, ...accountData };
    this.accounts.set(id, updatedAccount);
    return updatedAccount;
  }

  async deleteAccount(id: number): Promise<boolean> {
    return this.accounts.delete(id);
  }

  async getTotalBalance(): Promise<number> {
    const accounts = await this.getAccounts();
    return accounts.reduce((sum, account) => {
      if (account.type === 'credit') {
        return sum - Number(account.balance);
      }
      return sum + Number(account.balance);
    }, 0);
  }

  async getTransactions(limit?: number): Promise<Transaction[]> {
    const transactions = Array.from(this.transactions.values()).sort(
      (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()
    );

    if (limit) {
      return transactions.slice(0, limit);
    }
    return transactions;
  }

  async getTransaction(id: number): Promise<Transaction | undefined> {
    return this.transactions.get(id);
  }

  async getTransactionsByAccount(accountId: number): Promise<Transaction[]> {
    return Array.from(this.transactions.values())
      .filter(transaction => transaction.accountId === accountId)
      .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  }

  async createTransaction(insertTransaction: InsertTransaction): Promise<Transaction> {
    const id = this.transactionCurrentId++;
    const transaction: Transaction = {
      ...insertTransaction,
      id,
      date: insertTransaction.date || new Date(),
      category: insertTransaction.category || null,
      icon: insertTransaction.icon || 'credit-card',
    };
    this.transactions.set(id, transaction);

    const account = await this.getAccount(transaction.accountId);
    if (account) {
      const balanceChange =
        transaction.type === 'income' ? Number(transaction.amount) : -Number(transaction.amount);

      await this.updateAccount(account.id, {
        balance: String(Number(account.balance) + balanceChange),
      });
    }

    return transaction;
  }

  async updateTransaction(
    id: number,
    transactionData: Partial<InsertTransaction>
  ): Promise<Transaction | undefined> {
    const transaction = this.transactions.get(id);
    if (!transaction) return undefined;

    if (transactionData.amount !== undefined || transactionData.type !== undefined) {
      const account = await this.getAccount(transaction.accountId);

      if (account) {
        const oldBalanceChange =
          transaction.type === 'income' ? -Number(transaction.amount) : Number(transaction.amount);

        const newAmount =
          transactionData.amount !== undefined
            ? Number(transactionData.amount)
            : Number(transaction.amount);
        const newType =
          transactionData.type !== undefined ? transactionData.type : transaction.type;

        const newBalanceChange = newType === 'income' ? Number(newAmount) : -Number(newAmount);

        await this.updateAccount(account.id, {
          balance: String(Number(account.balance) + oldBalanceChange + newBalanceChange),
        });
      }
    }

    const updatedTransaction = { ...transaction, ...transactionData };
    this.transactions.set(id, updatedTransaction);
    return updatedTransaction;
  }

  async deleteTransaction(id: number): Promise<boolean> {
    const transaction = this.transactions.get(id);
    if (!transaction) return false;

    const account = await this.getAccount(transaction.accountId);
    if (account) {
      const balanceChange =
        transaction.type === 'income' ? -Number(transaction.amount) : Number(transaction.amount);

      await this.updateAccount(account.id, {
        balance: String(Number(account.balance) + balanceChange),
      });
    }

    return this.transactions.delete(id);
  }

  async getFinancialGoals(): Promise<FinancialGoal[]> {
    return Array.from(this.financialGoals.values());
  }

  async getFinancialGoal(id: number): Promise<FinancialGoal | undefined> {
    return this.financialGoals.get(id);
  }

  async createFinancialGoal(insertGoal: InsertFinancialGoal): Promise<FinancialGoal> {
    const id = this.goalCurrentId++;
    const goal: FinancialGoal = {
      ...insertGoal,
      id,
      description: insertGoal.description || null,
      currentAmount: insertGoal.currentAmount || '0',
      status: insertGoal.status || 'pending',
      icon: insertGoal.icon || 'target',
      color: insertGoal.color || 'blue',
    };
    this.financialGoals.set(id, goal);
    return goal;
  }

  async updateFinancialGoal(
    id: number,
    goalData: Partial<InsertFinancialGoal>
  ): Promise<FinancialGoal | undefined> {
    const goal = this.financialGoals.get(id);
    if (!goal) return undefined;

    const updatedGoal = { ...goal, ...goalData };

    if (goalData.currentAmount !== undefined && goalData.status === undefined) {
      const progress = Number(updatedGoal.currentAmount) / Number(updatedGoal.targetAmount);
      if (progress >= 1) {
        updatedGoal.status = 'completed';
      } else if (progress > 0) {
        updatedGoal.status = 'in-progress';
      } else {
        updatedGoal.status = 'pending';
      }
    }

    this.financialGoals.set(id, updatedGoal);
    return updatedGoal;
  }

  async deleteFinancialGoal(id: number): Promise<boolean> {
    return this.financialGoals.delete(id);
  }
}
