import { insertTransactionSchema } from '@shared/schema';
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
    const data = insertTransactionSchema.parse(normalizeTransactionPayload(payload));
    return this.storage.createTransaction(data);
  }

  updateTransaction(id: number, payload: unknown) {
    const data = insertTransactionSchema.partial().parse(normalizeTransactionPayload(payload));
    return this.storage.updateTransaction(id, data);
  }

  deleteTransaction(id: number) {
    return this.storage.deleteTransaction(id);
  }
}
