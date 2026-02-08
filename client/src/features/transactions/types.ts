import type {
  InsertTransaction,
  TransactionAssignmentInput,
  TransactionWithAssignments as SharedTransactionWithAssignments,
} from '@shared/schema';

export type TransactionWithAssignments = SharedTransactionWithAssignments;

export type TransactionDateInput = string | Date;

type TransactionPayloadBase = Omit<InsertTransaction, 'date'> & {
  date?: TransactionDateInput | null;
};

export type CreateTransactionPayload = TransactionPayloadBase & {
  assignments: TransactionAssignmentInput[];
};

export type UpdateTransactionPayload = Partial<TransactionPayloadBase> & {
  assignments?: TransactionAssignmentInput[];
};
