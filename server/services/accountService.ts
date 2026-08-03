import { z } from 'zod';
import { insertAccountSchema, type Account, type Investment } from '@shared/schema';
import { ACCOUNT_REGISTERED_TYPES } from '@shared/goals';
import { TAX_PERSON_KEYS } from '@shared/taxPlanning';
import type { IStorage } from '../storage';

const accountValidationSchema = insertAccountSchema.extend({
  registeredType: z.enum(ACCOUNT_REGISTERED_TYPES).nullable().optional(),
  ownerPersonKey: z.enum(TAX_PERSON_KEYS).nullable().optional(),
});

export type AccountWithInvestments = Account & { linkedInvestmentsTotal?: number };

// Storage already derives `balance` from linked investments where
// applicable (single source of truth, self-healing on every read). This
// just flags which accounts that applies to, so the client knows to treat
// the balance as read-only instead of a directly-editable field.
function markInvestmentLinkedAccounts(
  accounts: Account[],
  investments: Investment[]
): AccountWithInvestments[] {
  const linkedAccountIds = new Set<number>();
  for (const investment of investments) {
    if (investment.accountId != null) linkedAccountIds.add(investment.accountId);
  }
  return accounts.map(account =>
    linkedAccountIds.has(account.id)
      ? { ...account, linkedInvestmentsTotal: Number(account.balance) }
      : account
  );
}

export class AccountService {
  constructor(private storage: IStorage) {}

  async listAccounts() {
    const [accounts, investments] = await Promise.all([
      this.storage.getAccounts(),
      this.storage.getInvestments(),
    ]);
    return markInvestmentLinkedAccounts(accounts, investments);
  }

  async getAccount(id: number) {
    const account = await this.storage.getAccount(id);
    if (!account) return undefined;
    const investments = await this.storage.getInvestments();
    return markInvestmentLinkedAccounts([account], investments)[0];
  }

  createAccount(payload: unknown) {
    const data = accountValidationSchema.parse(payload);
    return this.storage.createAccount(data);
  }

  updateAccount(id: number, payload: unknown) {
    const data = accountValidationSchema.partial().parse(payload);
    return this.storage.updateAccount(id, data);
  }

  deleteAccount(id: number) {
    return this.storage.deleteAccount(id);
  }

  getTotalBalance() {
    return this.storage.getTotalBalance();
  }
}
