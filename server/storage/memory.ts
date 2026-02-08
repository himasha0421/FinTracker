import {
  Account,
  InsertAccount,
  Transaction,
  InsertTransaction,
  TransactionAssignment,
  TransactionAssignmentInput,
  InsertTransactionAssignment,
  TransactionWithAssignments,
  FinancialGoal,
  InsertFinancialGoal,
  User,
  InsertUser,
  Investment,
  InsertInvestment,
  InvestmentContribution,
  InsertInvestmentContribution,
} from '@shared/schema';
import { IStorage } from './types';

export class MemoryStorage implements IStorage {
  private users: Map<number, User>;
  private accounts: Map<number, Account>;
  private transactions: Map<number, Transaction>;
  private transactionAssignments: Map<number, TransactionAssignment[]>;
  private financialGoals: Map<number, FinancialGoal>;
  private goalAccounts: Map<number, Set<number>>;
  private investments: Map<number, Investment>;
  private investmentContributions: Map<number, InvestmentContribution>;

  private userCurrentId: number;
  private accountCurrentId: number;
  private transactionCurrentId: number;
  private goalCurrentId: number;
  private investmentCurrentId: number;
  private investmentContributionCurrentId: number;

  constructor() {
    this.users = new Map();
    this.accounts = new Map();
    this.transactions = new Map();
    this.transactionAssignments = new Map();
    this.financialGoals = new Map();
    this.goalAccounts = new Map();
    this.investments = new Map();
    this.investmentContributions = new Map();

    this.userCurrentId = 1;
    this.accountCurrentId = 1;
    this.transactionCurrentId = 1;
    this.goalCurrentId = 1;
    this.investmentCurrentId = 1;
    this.investmentContributionCurrentId = 1;
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

  async getTransactions(limit?: number): Promise<TransactionWithAssignments[]> {
    const transactions = Array.from(this.transactions.values()).sort(
      (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()
    );

    if (limit) {
      return transactions.slice(0, limit).map(transaction => ({
        ...transaction,
        assignments: this.transactionAssignments.get(transaction.id) ?? [],
      }));
    }
    return transactions.map(transaction => ({
      ...transaction,
      assignments: this.transactionAssignments.get(transaction.id) ?? [],
    }));
  }

  async getTransaction(id: number): Promise<TransactionWithAssignments | undefined> {
    const transaction = this.transactions.get(id);
    if (!transaction) return undefined;
    return {
      ...transaction,
      assignments: this.transactionAssignments.get(id) ?? [],
    };
  }

  async getTransactionsByAccount(accountId: number): Promise<TransactionWithAssignments[]> {
    return Array.from(this.transactions.values())
      .filter(transaction => transaction.accountId === accountId)
      .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
      .map(transaction => ({
        ...transaction,
        assignments: this.transactionAssignments.get(transaction.id) ?? [],
      }));
  }

  async createTransaction(
    insertTransaction: InsertTransaction,
    assignments: TransactionAssignmentInput[]
  ): Promise<TransactionWithAssignments> {
    const id = this.transactionCurrentId++;
    const transaction: Transaction = {
      ...insertTransaction,
      id,
      date: insertTransaction.date || new Date(),
      category: insertTransaction.category || null,
      subcategory: insertTransaction.subcategory || null,
      icon: insertTransaction.icon || 'credit-card',
    };
    this.transactions.set(id, transaction);
    const assignmentRecords: TransactionAssignment[] = assignments.map((assignment, index) => ({
      id: index + 1,
      transactionId: id,
      assignee: assignment.assignee,
      sharePercent: assignment.sharePercent,
    }));
    this.transactionAssignments.set(id, assignmentRecords);

    const account = await this.getAccount(transaction.accountId);
    if (account) {
      const balanceChange =
        transaction.type === 'income' ? Number(transaction.amount) : -Number(transaction.amount);

      await this.updateAccount(account.id, {
        balance: String(Number(account.balance) + balanceChange),
      });
    }

    return {
      ...transaction,
      assignments: assignmentRecords,
    };
  }

  async updateTransaction(
    id: number,
    transactionData: Partial<InsertTransaction>,
    assignments?: TransactionAssignmentInput[]
  ): Promise<TransactionWithAssignments | undefined> {
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

    let assignmentRecords = this.transactionAssignments.get(id) ?? [];
    if (assignments !== undefined) {
      assignmentRecords = assignments.map((assignment, index) => ({
        id: index + 1,
        transactionId: id,
        assignee: assignment.assignee,
        sharePercent: assignment.sharePercent,
      }));
      this.transactionAssignments.set(id, assignmentRecords);
    }

    return {
      ...updatedTransaction,
      assignments: assignmentRecords,
    };
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

    this.transactionAssignments.delete(id);
    return this.transactions.delete(id);
  }

  async getTransactionAssignments(transactionId: number): Promise<TransactionAssignment[]> {
    return this.transactionAssignments.get(transactionId) ?? [];
  }

  async setTransactionAssignments(
    transactionId: number,
    assignments: InsertTransactionAssignment[]
  ): Promise<TransactionAssignment[]> {
    const assignmentRecords = assignments.map((assignment, index) => ({
      id: index + 1,
      transactionId,
      assignee: assignment.assignee,
      sharePercent: assignment.sharePercent,
    }));
    this.transactionAssignments.set(transactionId, assignmentRecords);
    return assignmentRecords;
  }

  async getFinancialGoals(): Promise<FinancialGoal[]> {
    const goals = Array.from(this.financialGoals.values());
    return this.hydrateGoalsWithAccounts(goals);
  }

  async getFinancialGoal(id: number): Promise<FinancialGoal | undefined> {
    const goal = this.financialGoals.get(id);
    if (!goal) return undefined;
    const [hydrated] = await this.hydrateGoalsWithAccounts([goal]);
    return hydrated;
  }

  async createFinancialGoal(
    insertGoal: InsertFinancialGoal,
    linkedAccountIds: number[] = []
  ): Promise<FinancialGoal> {
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
    if (linkedAccountIds.length) {
      this.goalAccounts.set(id, new Set(linkedAccountIds));
    }
    const [hydrated] = await this.hydrateGoalsWithAccounts([goal]);
    return hydrated;
  }

  async updateFinancialGoal(
    id: number,
    goalData: Partial<InsertFinancialGoal>,
    linkedAccountIds?: number[]
  ): Promise<FinancialGoal | undefined> {
    const goal = this.financialGoals.get(id);
    if (!goal) return undefined;

    const updatedGoal = { ...goal, ...goalData };

    if (goalData.currentAmount !== undefined && goalData.status === undefined) {
      updatedGoal.status = this.deriveGoalStatus(
        String(updatedGoal.currentAmount),
        String(updatedGoal.targetAmount)
      );
    }

    this.financialGoals.set(id, updatedGoal);
    if (linkedAccountIds !== undefined) {
      if (linkedAccountIds.length) {
        this.goalAccounts.set(id, new Set(linkedAccountIds));
      } else {
        this.goalAccounts.delete(id);
      }
    }
    const [hydrated] = await this.hydrateGoalsWithAccounts([updatedGoal]);
    return hydrated;
  }

  async deleteFinancialGoal(id: number): Promise<boolean> {
    this.goalAccounts.delete(id);
    return this.financialGoals.delete(id);
  }

  async getInvestments(): Promise<Investment[]> {
    return Array.from(this.investments.values());
  }

  async getInvestment(id: number): Promise<Investment | undefined> {
    return this.investments.get(id);
  }

  async createInvestment(insertInvestment: InsertInvestment): Promise<Investment> {
    const id = this.investmentCurrentId++;
    const investment: Investment = {
      ...insertInvestment,
      id,
      accountId: insertInvestment.accountId ?? null,
      symbol: insertInvestment.symbol ?? null,
      institution: insertInvestment.institution ?? null,
      currency: insertInvestment.currency ?? 'USD',
      currentValue: insertInvestment.currentValue ?? '0',
      monthlyContribution: insertInvestment.monthlyContribution ?? '0',
      notes: insertInvestment.notes ?? null,
    };
    this.investments.set(id, investment);
    return investment;
  }

  async updateInvestment(
    id: number,
    investmentData: Partial<InsertInvestment>
  ): Promise<Investment | undefined> {
    const investment = this.investments.get(id);
    if (!investment) return undefined;

    const updatedInvestment = { ...investment, ...investmentData };
    this.investments.set(id, updatedInvestment);
    return updatedInvestment;
  }

  async deleteInvestment(id: number): Promise<boolean> {
    const exists = this.investments.delete(id);
    if (!exists) return false;

    for (const [contributionId, contribution] of this.investmentContributions.entries()) {
      if (contribution.investmentId === id) {
        this.investmentContributions.delete(contributionId);
      }
    }
    return true;
  }

  async getInvestmentContributions(investmentId?: number): Promise<InvestmentContribution[]> {
    const contributions = Array.from(this.investmentContributions.values())
      .filter(contribution =>
        investmentId ? contribution.investmentId === investmentId : true
      )
      .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

    return contributions;
  }

  async getInvestmentContribution(id: number): Promise<InvestmentContribution | undefined> {
    return this.investmentContributions.get(id);
  }

  async createInvestmentContribution(
    insertContribution: InsertInvestmentContribution
  ): Promise<InvestmentContribution> {
    const id = this.investmentContributionCurrentId++;
    const contribution: InvestmentContribution = {
      ...insertContribution,
      id,
      date: insertContribution.date || new Date(),
      notes: insertContribution.notes ?? null,
    };
    this.investmentContributions.set(id, contribution);
    return contribution;
  }

  async updateInvestmentContribution(
    id: number,
    contributionData: Partial<InsertInvestmentContribution>
  ): Promise<InvestmentContribution | undefined> {
    const contribution = this.investmentContributions.get(id);
    if (!contribution) return undefined;

    const updatedContribution = { ...contribution, ...contributionData };
    this.investmentContributions.set(id, updatedContribution);
    return updatedContribution;
  }

  async deleteInvestmentContribution(id: number): Promise<boolean> {
    return this.investmentContributions.delete(id);
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
    return goals.map(goal => {
      const linkedAccountIds = Array.from(this.goalAccounts.get(goal.id) ?? []);
      if (!linkedAccountIds.length) return goal;
      const linkedAccounts = linkedAccountIds
        .map(accountId => this.accounts.get(accountId))
        .filter((account): account is Account => Boolean(account));
      if (!linkedAccounts.length) return goal;
      const total = linkedAccounts.reduce((sum, account) => sum + Number(account.balance), 0);
      return {
        ...goal,
        currentAmount: total.toFixed(2),
        linkedAccounts,
        status: this.deriveGoalStatus(String(total), String(goal.targetAmount)),
      };
    });
  }
}
