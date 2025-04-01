import { 
  Account, 
  InsertAccount, 
  Transaction, 
  InsertTransaction, 
  FinancialGoal, 
  InsertFinancialGoal, 
  User, 
  InsertUser 
} from "@shared/schema";

export interface IStorage {
  // User operations
  getUser(id: number): Promise<User | undefined>;
  getUserByUsername(username: string): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;

  // Account operations
  getAccounts(): Promise<Account[]>;
  getAccount(id: number): Promise<Account | undefined>;
  createAccount(account: InsertAccount): Promise<Account>;
  updateAccount(id: number, account: Partial<InsertAccount>): Promise<Account | undefined>;
  deleteAccount(id: number): Promise<boolean>;
  getTotalBalance(): Promise<number>;

  // Transaction operations
  getTransactions(limit?: number): Promise<Transaction[]>;
  getTransaction(id: number): Promise<Transaction | undefined>;
  getTransactionsByAccount(accountId: number): Promise<Transaction[]>;
  createTransaction(transaction: InsertTransaction): Promise<Transaction>;
  updateTransaction(id: number, transaction: Partial<InsertTransaction>): Promise<Transaction | undefined>;
  deleteTransaction(id: number): Promise<boolean>;

  // Financial Goal operations
  getFinancialGoals(): Promise<FinancialGoal[]>;
  getFinancialGoal(id: number): Promise<FinancialGoal | undefined>;
  createFinancialGoal(goal: InsertFinancialGoal): Promise<FinancialGoal>;
  updateFinancialGoal(id: number, goal: Partial<InsertFinancialGoal>): Promise<FinancialGoal | undefined>;
  deleteFinancialGoal(id: number): Promise<boolean>;
}

export class MemStorage implements IStorage {
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

    // Add some initial data for testing
    this.seedData();
  }

  // User operations
  async getUser(id: number): Promise<User | undefined> {
    return this.users.get(id);
  }

  async getUserByUsername(username: string): Promise<User | undefined> {
    return Array.from(this.users.values()).find(
      (user) => user.username === username,
    );
  }

  async createUser(insertUser: InsertUser): Promise<User> {
    const id = this.userCurrentId++;
    const user: User = { ...insertUser, id };
    this.users.set(id, user);
    return user;
  }

  // Account operations
  async getAccounts(): Promise<Account[]> {
    return Array.from(this.accounts.values());
  }

  async getAccount(id: number): Promise<Account | undefined> {
    return this.accounts.get(id);
  }

  async createAccount(insertAccount: InsertAccount): Promise<Account> {
    const id = this.accountCurrentId++;
    const account: Account = { ...insertAccount, id };
    this.accounts.set(id, account);
    return account;
  }

  async updateAccount(id: number, accountData: Partial<InsertAccount>): Promise<Account | undefined> {
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
      // Credit accounts typically have a negative balance
      if (account.type === 'credit') {
        return sum - Number(account.balance);
      }
      return sum + Number(account.balance);
    }, 0);
  }

  // Transaction operations
  async getTransactions(limit?: number): Promise<Transaction[]> {
    const transactions = Array.from(this.transactions.values())
      .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
    
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
    const transaction: Transaction = { ...insertTransaction, id };
    this.transactions.set(id, transaction);
    
    // Update account balance
    const account = await this.getAccount(transaction.accountId);
    if (account) {
      const balanceChange = transaction.type === 'income' 
        ? Number(transaction.amount) 
        : -Number(transaction.amount);
      
      await this.updateAccount(account.id, {
        balance: String(Number(account.balance) + balanceChange)
      });
    }
    
    return transaction;
  }

  async updateTransaction(id: number, transactionData: Partial<InsertTransaction>): Promise<Transaction | undefined> {
    const transaction = this.transactions.get(id);
    if (!transaction) return undefined;

    // If amount or type changes, we need to update account balance
    if (transactionData.amount !== undefined || transactionData.type !== undefined) {
      const account = await this.getAccount(transaction.accountId);
      
      if (account) {
        // Revert the old transaction impact
        const oldBalanceChange = transaction.type === 'income' 
          ? -Number(transaction.amount) 
          : Number(transaction.amount);
        
        // Calculate new transaction impact
        const newAmount = transactionData.amount !== undefined ? Number(transactionData.amount) : Number(transaction.amount);
        const newType = transactionData.type !== undefined ? transactionData.type : transaction.type;
        
        const newBalanceChange = newType === 'income' 
          ? Number(newAmount) 
          : -Number(newAmount);
        
        // Apply the net change
        await this.updateAccount(account.id, {
          balance: String(Number(account.balance) + oldBalanceChange + newBalanceChange)
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

    // Update account balance
    const account = await this.getAccount(transaction.accountId);
    if (account) {
      const balanceChange = transaction.type === 'income' 
        ? -Number(transaction.amount) 
        : Number(transaction.amount);
      
      await this.updateAccount(account.id, {
        balance: String(Number(account.balance) + balanceChange)
      });
    }

    return this.transactions.delete(id);
  }

  // Financial Goal operations
  async getFinancialGoals(): Promise<FinancialGoal[]> {
    return Array.from(this.financialGoals.values());
  }

  async getFinancialGoal(id: number): Promise<FinancialGoal | undefined> {
    return this.financialGoals.get(id);
  }

  async createFinancialGoal(insertGoal: InsertFinancialGoal): Promise<FinancialGoal> {
    const id = this.goalCurrentId++;
    const goal: FinancialGoal = { ...insertGoal, id };
    this.financialGoals.set(id, goal);
    return goal;
  }

  async updateFinancialGoal(id: number, goalData: Partial<InsertFinancialGoal>): Promise<FinancialGoal | undefined> {
    const goal = this.financialGoals.get(id);
    if (!goal) return undefined;

    const updatedGoal = { ...goal, ...goalData };
    
    // Only update status based on progress if status was not explicitly provided
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

  // Seed initial data
  private seedData() {
    // Create accounts
    this.createAccount({
      name: "Main Savings",
      description: "Personal savings",
      balance: "8459.45",
      type: "savings",
      icon: "wallet",
      color: "green"
    });

    this.createAccount({
      name: "Checking Account",
      description: "Daily expenses",
      balance: "2850.00",
      type: "checking",
      icon: "scale",
      color: "blue"
    });

    this.createAccount({
      name: "Investment Portfolio",
      description: "Stocks & ETFs",
      balance: "15230.80",
      type: "investment",
      icon: "plus-square",
      color: "purple"
    });

    this.createAccount({
      name: "Credit Card",
      description: "Pending charges",
      balance: "1300.00",
      type: "credit",
      icon: "credit-card",
      color: "red"
    });

    this.createAccount({
      name: "Savings Account",
      description: "Emergency fund",
      balance: "3000.00",
      type: "savings",
      icon: "wallet",
      color: "green"
    });

    // Create transactions
    const now = new Date();
    
    this.createTransaction({
      description: "Salary Deposit",
      amount: "4500.00",
      date: new Date(now.setHours(9, 0, 0, 0)),
      accountId: 1,
      category: "Income",
      type: "income",
      icon: "briefcase"
    });
    
    now.setHours(14, 45, 0, 0);
    this.createTransaction({
      description: "Apple Store Purchase",
      amount: "999.00",
      date: new Date(now.setHours(14, 45, 0, 0)),
      accountId: 2,
      category: "Electronics",
      type: "expense",
      icon: "shopping-bag"
    });
    
    const yesterday = new Date(now);
    yesterday.setDate(yesterday.getDate() - 1);
    
    this.createTransaction({
      description: "Netflix Subscription",
      amount: "15.99",
      date: yesterday,
      accountId: 2,
      category: "Entertainment",
      type: "expense",
      icon: "film"
    });
    
    this.createTransaction({
      description: "Superbase Subscription",
      amount: "12.99",
      date: yesterday,
      accountId: 2,
      category: "Software",
      type: "expense",
      icon: "database"
    });
    
    this.createTransaction({
      description: "Vercel Subscription",
      amount: "15.99",
      date: yesterday,
      accountId: 2,
      category: "Software",
      type: "expense",
      icon: "server"
    });
    
    this.createTransaction({
      description: "Groceries",
      amount: "250.00",
      date: new Date(yesterday.setHours(17, 30, 0, 0)),
      accountId: 2,
      category: "Food",
      type: "expense",
      icon: "shopping-cart"
    });
    
    // Create financial goals
    const decTarget = new Date();
    decTarget.setMonth(11, 31);
    decTarget.setFullYear(2024);
    
    this.createFinancialGoal({
      name: "Emergency Fund",
      description: "3 months of expenses saved",
      targetAmount: "15000.00",
      currentAmount: "9750.00", // 65% progress
      targetDate: decTarget,
      status: "in-progress",
      icon: "shield",
      color: "blue"
    });
    
    const junTarget = new Date();
    junTarget.setMonth(5, 30);
    junTarget.setFullYear(2024);
    
    this.createFinancialGoal({
      name: "Stock Portfolio",
      description: "Tech sector investment plan",
      targetAmount: "50000.00",
      currentAmount: "15000.00", // 30% progress
      targetDate: junTarget,
      status: "pending",
      icon: "trending-up",
      color: "yellow"
    });
    
    const marTarget = new Date();
    marTarget.setMonth(2, 31);
    marTarget.setFullYear(2025);
    
    this.createFinancialGoal({
      name: "Debt Repayment",
      description: "Student loan payoff plan",
      targetAmount: "25000.00",
      currentAmount: "11250.00", // 45% progress
      targetDate: marTarget,
      status: "in-progress",
      icon: "credit-card",
      color: "blue"
    });
  }
}

export const storage = new MemStorage();
