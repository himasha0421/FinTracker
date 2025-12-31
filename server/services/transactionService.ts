import {
  insertTransactionSchema,
  TransactionAssignmentInput,
} from '@shared/schema';
import { z } from 'zod';
import type { IStorage } from '../storage';

function normalizeTransactionPayload(payload: any) {
  const data = { ...payload };
  if (data.date && typeof data.date === 'string') {
    const [year, month, day] = data.date.split('-').map(Number);
    if (year && month && day) {
      data.date = new Date(Date.UTC(year, month - 1, day, 12, 0, 0));
    } else {
      data.date = new Date(data.date);
    }
  }
  return data;
}

const assignmentInputSchema = z.object({
  assignee: z.string().min(1, 'Assignee is required'),
  sharePercent: z.preprocess(
    value => {
      if (typeof value === 'number') return value;
      if (typeof value === 'string' && value.trim() !== '') {
        const parsed = Number(value);
        return isNaN(parsed) ? value : parsed;
      }
      return value;
    },
    z
      .number({ required_error: 'Share percentage is required' })
      .positive('Percentage must be greater than 0')
      .max(100, 'Percentage cannot exceed 100')
  ),
});

const assignmentsSchema = z
  .array(assignmentInputSchema)
  .nonempty('At least one assignee is required')
  .superRefine((assignments, ctx) => {
    const total = assignments.reduce((sum, assignment) => sum + assignment.sharePercent, 0);
    if (Math.abs(total - 100) > 0.01) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'Assignment percentages must total 100%',
      });
    }
  });

const transactionCreateSchema = insertTransactionSchema.extend({
  assignments: assignmentsSchema.optional(),
});

const transactionUpdateSchema = insertTransactionSchema.partial().extend({
  assignments: assignmentsSchema.optional(),
});

function formatAssignmentInputs(assignments?: z.infer<typeof assignmentsSchema>): TransactionAssignmentInput[] {
  if (!assignments || assignments.length === 0) {
    return [{ assignee: 'Hima', sharePercent: '100' }];
  }

  return assignments.map(assignment => ({
    assignee: assignment.assignee,
    sharePercent: assignment.sharePercent.toString(),
  }));
}

export class TransactionService {
  constructor(private storage: IStorage) {}

  listTransactions(limit?: number) {
    return this.storage.getTransactions(limit);
  }

  getTransaction(id: number) {
    return this.storage.getTransaction(id);
  }

  getTransactionsByAccount(accountId: number) {
    return this.storage.getTransactionsByAccount(accountId);
  }

  createTransaction(payload: unknown) {
    const normalized = normalizeTransactionPayload(payload);
    const data = transactionCreateSchema.parse(normalized);
    const { assignments, ...transactionData } = data;
    return this.storage.createTransaction(
      transactionData,
      formatAssignmentInputs(assignments)
    );
  }

  updateTransaction(id: number, payload: unknown) {
    const normalized = normalizeTransactionPayload(payload);
    const data = transactionUpdateSchema.parse(normalized);
    const { assignments, ...transactionData } = data;
    return this.storage.updateTransaction(
      id,
      transactionData,
      assignments ? formatAssignmentInputs(assignments) : undefined
    );
  }

  deleteTransaction(id: number) {
    return this.storage.deleteTransaction(id);
  }
}
