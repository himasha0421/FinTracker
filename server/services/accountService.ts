import { insertAccountSchema } from '@shared/schema';
import type { IStorage } from '../storage';

export class AccountService {
  constructor(private storage: IStorage) {}

  listAccounts() {
    return this.storage.getAccounts();
  }

  getAccount(id: number) {
    return this.storage.getAccount(id);
  }

  createAccount(payload: unknown) {
    const data = insertAccountSchema.parse(payload);
    return this.storage.createAccount(data);
  }

  updateAccount(id: number, payload: unknown) {
    const data = insertAccountSchema.partial().parse(payload);
    return this.storage.updateAccount(id, data);
  }

  deleteAccount(id: number) {
    return this.storage.deleteAccount(id);
  }

  getTotalBalance() {
    return this.storage.getTotalBalance();
  }
}
