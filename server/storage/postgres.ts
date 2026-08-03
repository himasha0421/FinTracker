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
  Investment,
  InsertInvestment,
  InvestmentGroup,
  InsertInvestmentGroup,
  InvestmentContribution,
  InsertInvestmentContribution,
  User,
  InsertUser,
  accounts,
  transactions,
  transactionAssignments,
  financialGoals,
  investmentGroups,
  investments,
  investmentContributions,
  users,
  financialGoalAccounts,
  InsertFinancialGoalAccount,
  TaxPlan,
  InsertTaxPlan,
  TaxPlanScenario,
  InsertTaxPlanScenario,
  taxPlans,
  taxPlanScenarios,
} from '@shared/schema';
import { computeBucketBreakdown } from '@shared/goals';
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

  // An account with linked investments should never disagree with the
  // Investments tab — derive its balance from those investments at read
  // time (self-healing) instead of trusting a separately-stored number that
  // can drift. Used by every account read path (list/detail/goal linking)
  // so they all agree, not just the top-level accounts list.
  private async hydrateAccountBalances(accountsList: Account[]): Promise<Account[]> {
    if (!accountsList.length) return accountsList;
    const accountIds = accountsList.map(account => account.id);
    const linkedInvestments = await db
      .select()
      .from(investments)
      .where(inArray(investments.accountId, accountIds));

    const totalsByAccount = new Map<number, number>();
    linkedInvestments.forEach(investment => {
      if (investment.accountId == null) return;
      totalsByAccount.set(
        investment.accountId,
        (totalsByAccount.get(investment.accountId) ?? 0) + Number(investment.currentValue)
      );
    });

    return accountsList.map(account => {
      const total = totalsByAccount.get(account.id);
      if (total === undefined) return account;
      return { ...account, balance: total.toFixed(2) };
    });
  }

  async getAccounts(): Promise<Account[]> {
    const result = await db.select().from(accounts);
    return this.hydrateAccountBalances(result);
  }

  async getAccount(id: number): Promise<Account | undefined> {
    const result = await db.select().from(accounts).where(eq(accounts.id, id)).limit(1);
    if (!result[0]) return undefined;
    return (await this.hydrateAccountBalances([result[0]]))[0];
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
      if (account.type === 'credit' || account.type === 'loan') {
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
    tx: any,
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

  async getInvestmentGroups(): Promise<InvestmentGroup[]> {
    return db.select().from(investmentGroups).orderBy(investmentGroups.name);
  }

  async getInvestmentGroup(id: number): Promise<InvestmentGroup | undefined> {
    const result = await db
      .select()
      .from(investmentGroups)
      .where(eq(investmentGroups.id, id))
      .limit(1);
    return result[0];
  }

  async createInvestmentGroup(insertGroup: InsertInvestmentGroup): Promise<InvestmentGroup> {
    const result = await db.insert(investmentGroups).values(insertGroup).returning();
    return result[0];
  }

  async updateInvestmentGroup(
    id: number,
    groupData: Partial<InsertInvestmentGroup>
  ): Promise<InvestmentGroup | undefined> {
    const result = await db
      .update(investmentGroups)
      .set(groupData)
      .where(eq(investmentGroups.id, id))
      .returning();
    return result[0];
  }

  async deleteInvestmentGroup(id: number): Promise<boolean> {
    const result = await db
      .delete(investmentGroups)
      .where(eq(investmentGroups.id, id))
      .returning();
    return result.length > 0;
  }

  async getInvestments(): Promise<Investment[]> {
    return db.select().from(investments);
  }

  async getInvestment(id: number): Promise<Investment | undefined> {
    const result = await db.select().from(investments).where(eq(investments.id, id)).limit(1);
    return result[0];
  }

  async createInvestment(insertInvestment: InsertInvestment): Promise<Investment> {
    const result = await db.insert(investments).values(insertInvestment).returning();
    return result[0];
  }

  async updateInvestment(
    id: number,
    investmentData: Partial<InsertInvestment>
  ): Promise<Investment | undefined> {
    const result = await db
      .update(investments)
      .set(investmentData)
      .where(eq(investments.id, id))
      .returning();
    return result[0];
  }

  async deleteInvestment(id: number): Promise<boolean> {
    const result = await db.delete(investments).where(eq(investments.id, id)).returning();
    return result.length > 0;
  }

  async getInvestmentContributions(
    investmentId?: number
  ): Promise<InvestmentContribution[]> {
    if (investmentId !== undefined) {
      return db
        .select()
        .from(investmentContributions)
        .where(eq(investmentContributions.investmentId, investmentId))
        .orderBy(desc(investmentContributions.date));
    }
    return db.select().from(investmentContributions).orderBy(desc(investmentContributions.date));
  }

  async getInvestmentContribution(id: number): Promise<InvestmentContribution | undefined> {
    const result = await db
      .select()
      .from(investmentContributions)
      .where(eq(investmentContributions.id, id))
      .limit(1);
    return result[0];
  }

  async createInvestmentContribution(
    insertContribution: InsertInvestmentContribution
  ): Promise<InvestmentContribution> {
    const result = await db
      .insert(investmentContributions)
      .values(insertContribution)
      .returning();
    return result[0];
  }

  async updateInvestmentContribution(
    id: number,
    contributionData: Partial<InsertInvestmentContribution>
  ): Promise<InvestmentContribution | undefined> {
    const result = await db
      .update(investmentContributions)
      .set(contributionData)
      .where(eq(investmentContributions.id, id))
      .returning();
    return result[0];
  }

  async deleteInvestmentContribution(id: number): Promise<boolean> {
    const result = await db
      .delete(investmentContributions)
      .where(eq(investmentContributions.id, id))
      .returning();
    return result.length > 0;
  }

  async getTaxPlans(): Promise<TaxPlan[]> {
    return db.select().from(taxPlans).orderBy(desc(taxPlans.updatedAt));
  }

  async getTaxPlan(id: number): Promise<TaxPlan | undefined> {
    const result = await db.select().from(taxPlans).where(eq(taxPlans.id, id)).limit(1);
    return result[0];
  }

  async createTaxPlan(insertPlan: InsertTaxPlan): Promise<TaxPlan> {
    const result = await db.insert(taxPlans).values(insertPlan).returning();
    return result[0];
  }

  async updateTaxPlan(id: number, planData: Partial<InsertTaxPlan>): Promise<TaxPlan | undefined> {
    const result = await db
      .update(taxPlans)
      .set({ ...planData, updatedAt: new Date() })
      .where(eq(taxPlans.id, id))
      .returning();
    return result[0];
  }

  async deleteTaxPlan(id: number): Promise<boolean> {
    const result = await db.delete(taxPlans).where(eq(taxPlans.id, id)).returning();
    return result.length > 0;
  }

  async getTaxPlanScenarios(planId: number): Promise<TaxPlanScenario[]> {
    return db
      .select()
      .from(taxPlanScenarios)
      .where(eq(taxPlanScenarios.planId, planId))
      .orderBy(taxPlanScenarios.id);
  }

  async getTaxPlanScenario(id: number): Promise<TaxPlanScenario | undefined> {
    const result = await db
      .select()
      .from(taxPlanScenarios)
      .where(eq(taxPlanScenarios.id, id))
      .limit(1);
    return result[0];
  }

  async createTaxPlanScenario(
    insertScenario: InsertTaxPlanScenario
  ): Promise<TaxPlanScenario> {
    const result = await db.insert(taxPlanScenarios).values(insertScenario).returning();
    return result[0];
  }

  async updateTaxPlanScenario(
    id: number,
    scenarioData: Partial<InsertTaxPlanScenario>
  ): Promise<TaxPlanScenario | undefined> {
    const result = await db
      .update(taxPlanScenarios)
      .set({ ...scenarioData, updatedAt: new Date() })
      .where(eq(taxPlanScenarios.id, id))
      .returning();
    return result[0];
  }

  async deleteTaxPlanScenario(id: number): Promise<boolean> {
    const result = await db
      .delete(taxPlanScenarios)
      .where(eq(taxPlanScenarios.id, id))
      .returning();
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
    const rawLinkedAccountsList = accountIds.length
      ? await db.select().from(accounts).where(inArray(accounts.id, accountIds))
      : [];
    const linkedAccountsList = await this.hydrateAccountBalances(rawLinkedAccountsList);

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
        ...(goal.type === 'home-purchase' ? { bucketBreakdown: computeBucketBreakdown(linked) } : {}),
      };
    });
  }

  private async setGoalAccounts(
    tx: any,
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
