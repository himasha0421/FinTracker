import { db } from './db';
import { eq, desc, sql, count } from 'drizzle-orm';
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
import { IStorage } from './storage';

export class PostgresStorage implements IStorage {
  constructor() {
    // Initialize the database and seed data if needed
    this.seedDataIfNeeded();
  }

  // User operations
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

  // Account operations
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
      // Credit accounts typically have a negative balance
      if (account.type === 'credit') {
        return sum - Number(account.balance);
      }
      return sum + Number(account.balance);
    }, 0);
  }

  // Transaction operations
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
    // Use a transaction to ensure atomicity
    return db.transaction(async (tx) => {
      // Insert the transaction
      const result = await tx.insert(transactions).values(insertTransaction).returning();
      const transaction = result[0];

      // Update account balance
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
    return db.transaction(async (tx) => {
      // Get the original transaction
      const transactionResult = await tx
        .select()
        .from(transactions)
        .where(eq(transactions.id, id))
        .limit(1);
      
      const transaction = transactionResult[0];
      if (!transaction) return undefined;

      // If amount or type changes, we need to update account balance
      if (transactionData.amount !== undefined || transactionData.type !== undefined) {
        const accountResult = await tx
          .select()
          .from(accounts)
          .where(eq(accounts.id, transaction.accountId))
          .limit(1);
        
        const account = accountResult[0];
        if (account) {
          // Revert the old transaction impact
          const oldBalanceChange =
            transaction.type === 'income' ? -Number(transaction.amount) : Number(transaction.amount);

          // Calculate new transaction impact
          const newAmount =
            transactionData.amount !== undefined
              ? Number(transactionData.amount)
              : Number(transaction.amount);
          const newType =
            transactionData.type !== undefined ? transactionData.type : transaction.type;

          const newBalanceChange = newType === 'income' ? Number(newAmount) : -Number(newAmount);

          // Apply the net change
          await tx
            .update(accounts)
            .set({
              balance: String(Number(account.balance) + oldBalanceChange + newBalanceChange),
            })
            .where(eq(accounts.id, account.id));
        }
      }

      // Update the transaction
      const result = await tx
        .update(transactions)
        .set(transactionData)
        .where(eq(transactions.id, id))
        .returning();
      
      return result[0];
    });
  }

  async deleteTransaction(id: number): Promise<boolean> {
    return db.transaction(async (tx) => {
      // Get the transaction
      const transactionResult = await tx
        .select()
        .from(transactions)
        .where(eq(transactions.id, id))
        .limit(1);
      
      const transaction = transactionResult[0];
      if (!transaction) return false;

      // Update account balance
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

      // Delete the transaction
      const result = await tx
        .delete(transactions)
        .where(eq(transactions.id, id))
        .returning();
      
      return result.length > 0;
    });
  }

  // Financial Goal operations
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
    // Get the current goal
    const currentGoalResult = await db
      .select()
      .from(financialGoals)
      .where(eq(financialGoals.id, id))
      .limit(1);
    
    const currentGoal = currentGoalResult[0];
    if (!currentGoal) return undefined;

    // Prepare the update data
    const updateData = { ...goalData };

    // Only update status based on progress if status was not explicitly provided
    if (goalData.currentAmount !== undefined && goalData.status === undefined) {
      const currentAmount = goalData.currentAmount !== undefined 
        ? goalData.currentAmount 
        : currentGoal.currentAmount;
      
      const targetAmount = goalData.targetAmount !== undefined 
        ? goalData.targetAmount 
        : currentGoal.targetAmount;
      
      const progress = Number(currentAmount) / Number(targetAmount);
      
      if (progress >= 1) {
        updateData.status = 'completed';
      } else if (progress > 0) {
        updateData.status = 'in-progress';
      } else {
        updateData.status = 'pending';
      }
    }

    // Update the goal
    const result = await db
      .update(financialGoals)
      .set(updateData)
      .where(eq(financialGoals.id, id))
      .returning();
    
    return result[0];
  }

  async deleteFinancialGoal(id: number): Promise<boolean> {
    const result = await db
      .delete(financialGoals)
      .where(eq(financialGoals.id, id))
      .returning();
    return result.length > 0;
  }

  // Seed data if needed
  private async seedDataIfNeeded() {
    try {
      // Check if data already exists
      const accountCount = await db
        .select({ value: sql<number>`count(*)` })
        .from(accounts);
      
      if (accountCount[0].value > 0) {
        console.log('Database already has data, skipping seed');
        return; // Data already exists
      }

      console.log('Seeding initial data to PostgreSQL database...');
      
      // Create accounts
      await this.createAccount({
        name: 'Main Savings',
        description: 'Personal savings',
        balance: '8459.45',
        type: 'savings',
        icon: 'wallet',
        color: 'green',
      });

      await this.createAccount({
        name: 'Checking Account',
        description: 'Daily expenses',
        balance: '2850.00',
        type: 'checking',
        icon: 'scale',
        color: 'blue',
      });

      await this.createAccount({
        name: 'Investment Portfolio',
        description: 'Stocks & ETFs',
        balance: '15230.80',
        type: 'investment',
        icon: 'plus-square',
        color: 'purple',
      });

      await this.createAccount({
        name: 'Credit Card',
        description: 'Pending charges',
        balance: '1300.00',
        type: 'credit',
        icon: 'credit-card',
        color: 'red',
      });

      await this.createAccount({
        name: 'Savings Account',
        description: 'Emergency fund',
        balance: '3000.00',
        type: 'savings',
        icon: 'wallet',
        color: 'green',
      });

      // Create transactions
      const now = new Date();

      await this.createTransaction({
        description: 'Salary Deposit',
        amount: '4500.00',
        date: new Date(now.getFullYear(), now.getMonth(), now.getDate(), 9, 0, 0),
        accountId: 1,
        category: 'Income',
        type: 'income',
        icon: 'briefcase',
      });

      await this.createTransaction({
        description: 'Apple Store Purchase',
        amount: '999.00',
        date: new Date(now.getFullYear(), now.getMonth(), now.getDate(), 14, 45, 0),
        accountId: 2,
        category: 'Electronics',
        type: 'expense',
        icon: 'shopping-bag',
      });

      const yesterday = new Date(now);
      yesterday.setDate(yesterday.getDate() - 1);

      await this.createTransaction({
        description: 'Netflix Subscription',
        amount: '15.99',
        date: yesterday,
        accountId: 2,
        category: 'Entertainment',
        type: 'expense',
        icon: 'film',
      });

      await this.createTransaction({
        description: 'Superbase Subscription',
        amount: '12.99',
        date: yesterday,
        accountId: 2,
        category: 'Software',
        type: 'expense',
        icon: 'database',
      });

      await this.createTransaction({
        description: 'Vercel Subscription',
        amount: '15.99',
        date: yesterday,
        accountId: 2,
        category: 'Software',
        type: 'expense',
        icon: 'server',
      });

      await this.createTransaction({
        description: 'Groceries',
        amount: '250.00',
        date: new Date(yesterday.getFullYear(), yesterday.getMonth(), yesterday.getDate(), 17, 30, 0),
        accountId: 2,
        category: 'Food',
        type: 'expense',
        icon: 'shopping-cart',
      });

      // Create financial goals
      const decTarget = new Date();
      decTarget.setMonth(11, 31);
      decTarget.setFullYear(2024);

      await this.createFinancialGoal({
        name: 'Emergency Fund',
        description: '3 months of expenses saved',
        targetAmount: '15000.00',
        currentAmount: '9750.00', // 65% progress
        targetDate: decTarget,
        status: 'in-progress',
        icon: 'shield',
        color: 'blue',
      });

      const junTarget = new Date();
      junTarget.setMonth(5, 30);
      junTarget.setFullYear(2024);

      await this.createFinancialGoal({
        name: 'Stock Portfolio',
        description: 'Tech sector investment plan',
        targetAmount: '50000.00',
        currentAmount: '15000.00', // 30% progress
        targetDate: junTarget,
        status: 'pending',
        icon: 'trending-up',
        color: 'yellow',
      });

      const marTarget = new Date();
      marTarget.setMonth(2, 31);
      marTarget.setFullYear(2025);

      await this.createFinancialGoal({
        name: 'Debt Repayment',
        description: 'Student loan payoff plan',
        targetAmount: '25000.00',
        currentAmount: '11250.00', // 45% progress
        targetDate: marTarget,
        status: 'in-progress',
        icon: 'credit-card',
        color: 'blue',
      });

      console.log('Seed data created successfully');
    } catch (error) {
      console.error('Error seeding data:', error);
    }
  }
}