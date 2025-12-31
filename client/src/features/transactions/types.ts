import type {
  InsertTransaction,
  TransactionAssignmentInput,
  TransactionWithAssignments as SharedTransactionWithAssignments,
} from '@shared/schema';

export type TransactionWithAssignments = SharedTransactionWithAssignments;

export type CreateTransactionPayload = InsertTransaction & {
  assignments: TransactionAssignmentInput[];
};

export type UpdateTransactionPayload = Partial<InsertTransaction> & {
  assignments?: TransactionAssignmentInput[];
};
