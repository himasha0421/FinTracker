import { db } from '../db';
import { eq, desc } from 'drizzle-orm';
import {
  Account,
  InsertAccount,
  Transaction,
  InsertTransaction,
  FinancialGoal,
  InsertFinancialGoal,
  User,
  InsertUser,
  accounts,
  transactions,
  financialGoals,
  users,
} from '@shared/schema';
import { IStorage } from './types';

export class PostgresStorage implements IStorage {
  async getUser(id: number): Promise<User | undefined> {
    const result = await db.select().from(users).where(eq(users.id, id)).limit(1);
    return result[0];
  }

  async getUserByUsername(username: string): Promise<User | undefined> {
    const result = await db.select().from(users).where(eq(users.username, username)).limit(1);
    return result[0];
  }

  async createUser(insertUser: InsertUser): Promise<User> {
    const result = await db.insert(users).values(insertUser).returning();
    return result[0];
  }

  async getAccounts(): Promise<Account[]> {
    return db.select().from(accounts);
  }

  async getAccount(id: number): Promise<Account | undefined> {
    const result = await db.select().from(accounts).where(eq(accounts.id, id)).limit(1);
    return result[0];
  }

  async createAccount(insertAccount: InsertAccount): Promise<Account> {
    const result = await db.insert(accounts).values(insertAccount).returning();
    return result[0];
  }

  async updateAccount(
    id: number,
    accountData: Partial<InsertAccount>
  ): Promise<Account | undefined> {
    const result = await db
      .update(accounts)
      .set(accountData)
      .where(eq(accounts.id, id))
      .returning();
    return result[0];
  }

  async deleteAccount(id: number): Promise<boolean> {
    const result = await db.delete(accounts).where(eq(accounts.id, id)).returning();
    return result.length > 0;
  }

  async getTotalBalance(): Promise<number> {
    const allAccounts = await this.getAccounts();
    return allAccounts.reduce((sum, account) => {
      if (account.type === 'credit') {
        return sum - Number(account.balance);
      }
      return sum + Number(account.balance);
    }, 0);
  }

  async getTransactions(limit?: number): Promise<Transaction[]> {
    const query = db.select().from(transactions).orderBy(desc(transactions.date));

    if (limit) {
      query.limit(limit);
    }

    return query;
  }

  async getTransaction(id: number): Promise<Transaction | undefined> {
    const result = await db.select().from(transactions).where(eq(transactions.id, id)).limit(1);
    return result[0];
  }

  async getTransactionsByAccount(accountId: number): Promise<Transaction[]> {
    return db
      .select()
      .from(transactions)
      .where(eq(transactions.accountId, accountId))
      .orderBy(desc(transactions.date));
  }

  async createTransaction(insertTransaction: InsertTransaction): Promise<Transaction> {
    return db.transaction(async tx => {
      const result = await tx.insert(transactions).values(insertTransaction).returning();
      const transaction = result[0];

      const accountResult = await tx
        .select()
        .from(accounts)
        .where(eq(accounts.id, transaction.accountId))
        .limit(1);

      const account = accountResult[0];
      if (account) {
        const balanceChange =
          transaction.type === 'income' ? Number(transaction.amount) : -Number(transaction.amount);

        await tx
          .update(accounts)
          .set({
            balance: String(Number(account.balance) + balanceChange),
          })
          .where(eq(accounts.id, account.id));
      }

      return transaction;
    });
  }

  async updateTransaction(
    id: number,
    transactionData: Partial<InsertTransaction>
  ): Promise<Transaction | undefined> {
    return db.transaction(async tx => {
      const transactionResult = await tx
        .select()
        .from(transactions)
        .where(eq(transactions.id, id))
        .limit(1);

      const transaction = transactionResult[0];
      if (!transaction) return undefined;

      if (transactionData.amount !== undefined || transactionData.type !== undefined) {
        const accountResult = await tx
          .select()
          .from(accounts)
          .where(eq(accounts.id, transaction.accountId))
          .limit(1);

        const account = accountResult[0];
        if (account) {
          const oldBalanceChange =
            transaction.type === 'income'
              ? -Number(transaction.amount)
              : Number(transaction.amount);

          const newAmount =
            transactionData.amount !== undefined
              ? Number(transactionData.amount)
              : Number(transaction.amount);
          const newType =
            transactionData.type !== undefined ? transactionData.type : transaction.type;

          const newBalanceChange = newType === 'income' ? Number(newAmount) : -Number(newAmount);

          await tx
            .update(accounts)
            .set({
              balance: String(Number(account.balance) + oldBalanceChange + newBalanceChange),
            })
            .where(eq(accounts.id, account.id));
        }
      }

      const result = await tx
        .update(transactions)
        .set(transactionData)
        .where(eq(transactions.id, id))
        .returning();

      return result[0];
    });
  }

  async deleteTransaction(id: number): Promise<boolean> {
    return db.transaction(async tx => {
      const transactionResult = await tx
        .select()
        .from(transactions)
        .where(eq(transactions.id, id))
        .limit(1);

      const transaction = transactionResult[0];
      if (!transaction) return false;

      const accountResult = await tx
        .select()
        .from(accounts)
        .where(eq(accounts.id, transaction.accountId))
        .limit(1);

      const account = accountResult[0];
      if (account) {
        const balanceChange =
          transaction.type === 'income' ? -Number(transaction.amount) : Number(transaction.amount);

        await tx
          .update(accounts)
          .set({
            balance: String(Number(account.balance) + balanceChange),
          })
          .where(eq(accounts.id, account.id));
      }

      const result = await tx
        .delete(transactions)
        .where(eq(transactions.id, id))
        .returning();

      return result.length > 0;
    });
  }

  async getFinancialGoals(): Promise<FinancialGoal[]> {
    return db.select().from(financialGoals);
  }

  async getFinancialGoal(id: number): Promise<FinancialGoal | undefined> {
    const result = await db
      .select()
      .from(financialGoals)
      .where(eq(financialGoals.id, id))
      .limit(1);
    return result[0];
  }

  async createFinancialGoal(insertGoal: InsertFinancialGoal): Promise<FinancialGoal> {
    const result = await db.insert(financialGoals).values(insertGoal).returning();
    return result[0];
  }

  async updateFinancialGoal(
    id: number,
    goalData: Partial<InsertFinancialGoal>
  ): Promise<FinancialGoal | undefined> {
    const currentGoalResult = await db
      .select()
      .from(financialGoals)
      .where(eq(financialGoals.id, id))
      .limit(1);

    const currentGoal = currentGoalResult[0];
    if (!currentGoal) return undefined;

    const updateData = { ...goalData };

    if (goalData.currentAmount !== undefined && goalData.status === undefined) {
      const currentAmount =
        goalData.currentAmount !== undefined ? goalData.currentAmount : currentGoal.currentAmount;

      const targetAmount =
        goalData.targetAmount !== undefined ? goalData.targetAmount : currentGoal.targetAmount;

      const progress = Number(currentAmount) / Number(targetAmount);

      if (progress >= 1) {
        updateData.status = 'completed';
      } else if (progress > 0) {
        updateData.status = 'in-progress';
      } else {
        updateData.status = 'pending';
      }
    }

    const result = await db
      .update(financialGoals)
      .set(updateData)
      .where(eq(financialGoals.id, id))
      .returning();

    return result[0];
  }

  async deleteFinancialGoal(id: number): Promise<boolean> {
    const result = await db.delete(financialGoals).where(eq(financialGoals.id, id)).returning();
    return result.length > 0;
  }
}
