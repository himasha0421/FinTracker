import { pgTable, text, serial, integer, decimal, timestamp } from 'drizzle-orm/pg-core';
import { createInsertSchema } from 'drizzle-zod';
import { z } from 'zod';

// Account table
export const accounts = pgTable('accounts', {
  id: serial('id').primaryKey(),
  name: text('name').notNull(),
  description: text('description'),
  balance: decimal('balance', { precision: 12, scale: 2 }).default('0').notNull(),
  type: text('type').notNull(), // savings, checking, credit, investment
  icon: text('icon').default('wallet'), // Default icon name
  color: text('color').default('green'), // Default color name
});

export const insertAccountSchema = createInsertSchema(accounts).omit({ id: true });
export type InsertAccount = z.infer<typeof insertAccountSchema>;
export type Account = typeof accounts.$inferSelect;

// Transaction table
export const transactions = pgTable('transactions', {
  id: serial('id').primaryKey(),
  description: text('description').notNull(),
  amount: decimal('amount', { precision: 12, scale: 2 }).notNull(),
  date: timestamp('date').defaultNow().notNull(),
  accountId: integer('account_id').notNull(),
  category: text('category'),
  type: text('type').notNull(), // income, expense
  icon: text('icon').default('credit-card'), // Default icon name
});

export const transactionAssignments = pgTable('transaction_assignments', {
  id: serial('id').primaryKey(),
  transactionId: integer('transaction_id')
    .references(() => transactions.id, { onDelete: 'cascade' })
    .notNull(),
  assignee: text('assignee').notNull(),
  sharePercent: decimal('share_percent', { precision: 5, scale: 2 }).notNull(),
});

export const insertTransactionSchema = createInsertSchema(transactions).omit({ id: true });
export const insertTransactionAssignmentSchema = createInsertSchema(transactionAssignments).omit({
  id: true,
});
export type InsertTransaction = z.infer<typeof insertTransactionSchema>;
export type InsertTransactionAssignment = z.infer<typeof insertTransactionAssignmentSchema>;
export type Transaction = typeof transactions.$inferSelect;
export type TransactionAssignment = typeof transactionAssignments.$inferSelect;
export type TransactionAssignmentInput = Omit<InsertTransactionAssignment, 'transactionId'>;
export type TransactionWithAssignments = Transaction & {
  assignments: TransactionAssignment[];
};

// Financial Goal table
export const financialGoals = pgTable('financial_goals', {
  id: serial('id').primaryKey(),
  name: text('name').notNull(),
  description: text('description'),
  targetAmount: decimal('target_amount', { precision: 12, scale: 2 }).notNull(),
  currentAmount: decimal('current_amount', { precision: 12, scale: 2 }).default('0').notNull(),
  targetDate: timestamp('target_date').notNull(),
  status: text('status').default('in-progress').notNull(), // in-progress, completed, pending
  icon: text('icon').default('target'), // Default icon name
  color: text('color').default('blue'), // Default color name
});

export const insertFinancialGoalSchema = createInsertSchema(financialGoals).omit({ id: true });
export type InsertFinancialGoal = z.infer<typeof insertFinancialGoalSchema>;
export type FinancialGoal = typeof financialGoals.$inferSelect;

export const financialGoalAccounts = pgTable('financial_goal_accounts', {
  id: serial('id').primaryKey(),
  goalId: integer('goal_id')
    .references(() => financialGoals.id, { onDelete: 'cascade' })
    .notNull(),
  accountId: integer('account_id')
    .references(() => accounts.id, { onDelete: 'cascade' })
    .notNull(),
});

export const insertFinancialGoalAccountSchema = createInsertSchema(financialGoalAccounts).omit({
  id: true,
});
export type InsertFinancialGoalAccount = z.infer<typeof insertFinancialGoalAccountSchema>;
export type FinancialGoalAccount = typeof financialGoalAccounts.$inferSelect;

// User table
export const users = pgTable('users', {
  id: serial('id').primaryKey(),
  username: text('username').notNull().unique(),
  password: text('password').notNull(),
});

export const insertUserSchema = createInsertSchema(users).pick({
  username: true,
  password: true,
});

export type InsertUser = z.infer<typeof insertUserSchema>;
export type User = typeof users.$inferSelect;
