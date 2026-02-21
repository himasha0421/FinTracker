import {
  Account,
  InsertAccount,
  Transaction,
  InsertTransaction,
  InsertTransactionAssignment,
  TransactionAssignment,
  TransactionWithAssignments,
  FinancialGoal,
  InsertFinancialGoal,
  User,
  InsertUser,
  TransactionAssignmentInput,
  Investment,
  InsertInvestment,
  InvestmentGroup,
  InsertInvestmentGroup,
  InvestmentContribution,
  InsertInvestmentContribution,
} from '@shared/schema';

export interface IStorage {
  getUser(id: number): Promise<User | undefined>;
  getUserByUsername(username: string): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;

  getAccounts(): Promise<Account[]>;
  getAccount(id: number): Promise<Account | undefined>;
  createAccount(account: InsertAccount): Promise<Account>;
  updateAccount(id: number, account: Partial<InsertAccount>): Promise<Account | undefined>;
  deleteAccount(id: number): Promise<boolean>;
  getTotalBalance(): Promise<number>;

  getTransactions(limit?: number): Promise<TransactionWithAssignments[]>;
  getTransaction(id: number): Promise<TransactionWithAssignments | undefined>;
  getTransactionsByAccount(accountId: number): Promise<TransactionWithAssignments[]>;
  createTransaction(
    transaction: InsertTransaction,
    assignments: TransactionAssignmentInput[]
  ): Promise<TransactionWithAssignments>;
  updateTransaction(
    id: number,
    transaction: Partial<InsertTransaction>,
    assignments?: TransactionAssignmentInput[]
  ): Promise<TransactionWithAssignments | undefined>;
  deleteTransaction(id: number): Promise<boolean>;
  getTransactionAssignments(transactionId: number): Promise<TransactionAssignment[]>;
  setTransactionAssignments(
    transactionId: number,
    assignments: InsertTransactionAssignment[]
  ): Promise<TransactionAssignment[]>;

  getFinancialGoals(): Promise<FinancialGoal[]>;
  getFinancialGoal(id: number): Promise<FinancialGoal | undefined>;
  createFinancialGoal(goal: InsertFinancialGoal, linkedAccountIds?: number[]): Promise<FinancialGoal>;
  updateFinancialGoal(
    id: number,
    goal: Partial<InsertFinancialGoal>,
    linkedAccountIds?: number[]
  ): Promise<FinancialGoal | undefined>;
  deleteFinancialGoal(id: number): Promise<boolean>;

  getInvestmentGroups(): Promise<InvestmentGroup[]>;
  getInvestmentGroup(id: number): Promise<InvestmentGroup | undefined>;
  createInvestmentGroup(group: InsertInvestmentGroup): Promise<InvestmentGroup>;
  updateInvestmentGroup(
    id: number,
    group: Partial<InsertInvestmentGroup>
  ): Promise<InvestmentGroup | undefined>;
  deleteInvestmentGroup(id: number): Promise<boolean>;

  getInvestments(): Promise<Investment[]>;
  getInvestment(id: number): Promise<Investment | undefined>;
  createInvestment(investment: InsertInvestment): Promise<Investment>;
  updateInvestment(id: number, investment: Partial<InsertInvestment>): Promise<Investment | undefined>;
  deleteInvestment(id: number): Promise<boolean>;

  getInvestmentContributions(investmentId?: number): Promise<InvestmentContribution[]>;
  getInvestmentContribution(id: number): Promise<InvestmentContribution | undefined>;
  createInvestmentContribution(
    contribution: InsertInvestmentContribution
  ): Promise<InvestmentContribution>;
  updateInvestmentContribution(
    id: number,
    contribution: Partial<InsertInvestmentContribution>
  ): Promise<InvestmentContribution | undefined>;
  deleteInvestmentContribution(id: number): Promise<boolean>;
}
