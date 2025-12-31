import { db } from '../db';
import { desc, eq, inArray } from 'drizzle-orm';
import {
  Account,
  InsertAccount,
  Transaction,
  InsertTransaction,
  TransactionWithAssignments,
  TransactionAssignment,
  InsertTransactionAssignment,
  TransactionAssignmentInput,
  FinancialGoal,
  InsertFinancialGoal,
  User,
  InsertUser,
  accounts,
  transactions,
  transactionAssignments,
  financialGoals,
  users,
  financialGoalAccounts,
  InsertFinancialGoalAccount,
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

  private async attachAssignments(transactionList: Transaction[]): Promise<TransactionWithAssignments[]> {
    if (transactionList.length === 0) {
      return [];
    }
    const transactionIds = transactionList.map(transaction => transaction.id);
    const assignments = await db
      .select()
      .from(transactionAssignments)
      .where(inArray(transactionAssignments.transactionId, transactionIds));

    const assignmentMap = new Map<number, TransactionAssignment[]>();
    for (const assignment of assignments) {
      const existing = assignmentMap.get(assignment.transactionId) ?? [];
      existing.push(assignment);
      assignmentMap.set(assignment.transactionId, existing);
    }

    return transactionList.map(transaction => ({
      ...transaction,
      assignments: assignmentMap.get(transaction.id) ?? [],
    }));
  }

  private async replaceAssignments(
    tx: typeof db,
    transactionId: number,
    assignments: TransactionAssignmentInput[]
  ): Promise<TransactionAssignment[]> {
    await tx.delete(transactionAssignments).where(eq(transactionAssignments.transactionId, transactionId));
    if (!assignments.length) {
      return [];
    }

    const values = assignments.map(assignment => ({
      ...assignment,
      transactionId,
    }));

    return tx.insert(transactionAssignments).values(values).returning();
  }

  async getTransactions(limit?: number): Promise<TransactionWithAssignments[]> {
    const query = db.select().from(transactions).orderBy(desc(transactions.date));

    if (limit) {
      query.limit(limit);
    }

    const transactionList = await query;
    return this.attachAssignments(transactionList);
  }

  async getTransaction(id: number): Promise<TransactionWithAssignments | undefined> {
    const result = await db.select().from(transactions).where(eq(transactions.id, id)).limit(1);
    const transaction = result[0];
    if (!transaction) return undefined;
    const assignments = await this.getTransactionAssignments(transaction.id);
    return {
      ...transaction,
      assignments,
    };
  }

  async getTransactionsByAccount(accountId: number): Promise<TransactionWithAssignments[]> {
    const transactionList = await db
      .select()
      .from(transactions)
      .where(eq(transactions.accountId, accountId))
      .orderBy(desc(transactions.date));
    return this.attachAssignments(transactionList);
  }

  async createTransaction(
    insertTransaction: InsertTransaction,
    assignments: TransactionAssignmentInput[]
  ): Promise<TransactionWithAssignments> {
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

      const assignmentRecords = await this.replaceAssignments(tx, transaction.id, assignments);

      return {
        ...transaction,
        assignments: assignmentRecords,
      };
    });
  }

  async updateTransaction(
    id: number,
    transactionData: Partial<InsertTransaction>,
    assignments?: TransactionAssignmentInput[]
  ): Promise<TransactionWithAssignments | undefined> {
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

      const updated = result[0]!;
      const assignmentRecords =
        assignments !== undefined
          ? await this.replaceAssignments(tx, id, assignments)
          : await this.getTransactionAssignments(id);

      return {
        ...updated,
        assignments: assignmentRecords,
      };
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

  async getTransactionAssignments(transactionId: number): Promise<TransactionAssignment[]> {
    return db
      .select()
      .from(transactionAssignments)
      .where(eq(transactionAssignments.transactionId, transactionId));
  }

  async setTransactionAssignments(
    transactionId: number,
    assignments: InsertTransactionAssignment[]
  ): Promise<TransactionAssignment[]> {
    return db.transaction(async tx => this.replaceAssignments(tx, transactionId, assignments));
  }

  async getFinancialGoals(): Promise<FinancialGoal[]> {
    const goals = await db.select().from(financialGoals);
    return this.hydrateGoalsWithAccounts(goals);
  }

  async getFinancialGoal(id: number): Promise<FinancialGoal | undefined> {
    const result = await db
      .select()
      .from(financialGoals)
      .where(eq(financialGoals.id, id))
      .limit(1);
    if (!result[0]) return undefined;
    const [goal] = await this.hydrateGoalsWithAccounts([result[0]]);
    return goal;
  }

  async createFinancialGoal(
    insertGoal: InsertFinancialGoal,
    linkedAccountIds: number[] = []
  ): Promise<FinancialGoal> {
    return db.transaction(async tx => {
      const result = await tx.insert(financialGoals).values(insertGoal).returning();
      const goal = result[0];
      await this.setGoalAccounts(tx, goal.id, linkedAccountIds);
      const [hydrated] = await this.hydrateGoalsWithAccounts([goal]);
      return hydrated;
    });
  }

  async updateFinancialGoal(
    id: number,
    goalData: Partial<InsertFinancialGoal>,
    linkedAccountIds?: number[]
  ): Promise<FinancialGoal | undefined> {
    return db.transaction(async tx => {
      const currentGoalResult = await tx
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

        updateData.status = this.deriveGoalStatus(String(currentAmount), String(targetAmount));
      }

      const result = await tx
        .update(financialGoals)
        .set(updateData)
        .where(eq(financialGoals.id, id))
        .returning();

      if (linkedAccountIds !== undefined) {
        await this.setGoalAccounts(tx, id, linkedAccountIds);
      }

      const [goal] = await this.hydrateGoalsWithAccounts([result[0]]);
      return goal;
    });
  }

  async deleteFinancialGoal(id: number): Promise<boolean> {
    const result = await db.delete(financialGoals).where(eq(financialGoals.id, id)).returning();
    return result.length > 0;
  }

  private deriveGoalStatus(currentAmount: string, targetAmount: string) {
    const target = Number(targetAmount);
    if (target <= 0) return 'pending';
    const current = Number(currentAmount);
    const progress = current / target;
    if (progress >= 1) return 'completed';
    if (progress > 0) return 'in-progress';
    return 'pending';
  }

  private async hydrateGoalsWithAccounts(goals: FinancialGoal[]): Promise<FinancialGoal[]> {
    if (!goals.length) return goals;

    const goalIds = goals.map(goal => goal.id);
    const goalLinks = await db
      .select()
      .from(financialGoalAccounts)
      .where(inArray(financialGoalAccounts.goalId, goalIds));

    if (!goalLinks.length) return goals;

    const accountIds = Array.from(new Set(goalLinks.map(link => link.accountId)));
    const linkedAccountsList = accountIds.length
      ? await db.select().from(accounts).where(inArray(accounts.id, accountIds))
      : [];

    const accountMap = new Map(linkedAccountsList.map(account => [account.id, account]));
    const accountsByGoal = new Map<number, Account[]>();

    goalLinks.forEach(link => {
      const account = accountMap.get(link.accountId);
      if (!account) return;
      const existing = accountsByGoal.get(link.goalId) ?? [];
      existing.push(account);
      accountsByGoal.set(link.goalId, existing);
    });

    return goals.map(goal => {
      const linked = accountsByGoal.get(goal.id);
      if (!linked || !linked.length) return goal;
      const total = linked.reduce((sum, account) => sum + Number(account.balance), 0);
      return {
        ...goal,
        currentAmount: total.toFixed(2),
        linkedAccounts: linked,
        status: this.deriveGoalStatus(String(total), String(goal.targetAmount)),
      };
    });
  }

  private async setGoalAccounts(
    tx: typeof db,
    goalId: number,
    linkedAccountIds?: number[]
  ): Promise<void> {
    await tx.delete(financialGoalAccounts).where(eq(financialGoalAccounts.goalId, goalId));
    if (!linkedAccountIds?.length) return;
    const values: InsertFinancialGoalAccount[] = linkedAccountIds
      .filter(accountId => !Number.isNaN(accountId))
      .map(accountId => ({ goalId, accountId }));
    if (!values.length) return;
    await tx.insert(financialGoalAccounts).values(values);
  }
}
