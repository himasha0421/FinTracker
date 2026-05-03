import {
  insertInvestmentSchema,
  insertInvestmentGroupSchema,
  insertInvestmentContributionSchema,
} from '@shared/schema';
import type { IStorage } from '../storage';

function normalizeInvestmentPayload(payload: any, partial = false) {
  const data = { ...payload };

  const normalizeDecimal = (value: any, fallback = '0') => {
    if (value === '' || value === null || value === undefined) return fallback;
    return value;
  };

  if (data.groupId === '' || data.groupId === null) {
    data.groupId = null;
  } else if (data.groupId !== undefined) {
    const parsed = Number(data.groupId);
    if (!Number.isNaN(parsed)) {
      data.groupId = parsed;
    }
  } else if (!partial) {
    data.groupId = null;
  }

  if (data.accountId === '' || data.accountId === null) {
    data.accountId = null;
  } else if (data.accountId !== undefined) {
    const parsed = Number(data.accountId);
    if (!Number.isNaN(parsed)) {
      data.accountId = parsed;
    }
  } else if (!partial) {
    data.accountId = null;
  }

  if (partial) {
    if (data.currentValue !== undefined) {
      data.currentValue = normalizeDecimal(data.currentValue);
    }
    if (data.monthlyContribution !== undefined) {
      data.monthlyContribution = normalizeDecimal(data.monthlyContribution);
    }
  } else {
    data.currentValue = normalizeDecimal(data.currentValue);
    data.monthlyContribution = normalizeDecimal(data.monthlyContribution);
  }

  if (typeof data.symbol === 'string' && data.symbol.trim() === '') {
    data.symbol = null;
  }
  if (typeof data.institution === 'string' && data.institution.trim() === '') {
    data.institution = null;
  }
  if (typeof data.notes === 'string' && data.notes.trim() === '') {
    data.notes = null;
  }
  if (typeof data.currency === 'string' && data.currency.trim() === '') {
    data.currency = 'USD';
  }

  return data;
}

function normalizeInvestmentGroupPayload(payload: any) {
  const data = { ...payload };

  if (typeof data.name === 'string') {
    data.name = data.name.trim();
    if (!data.name) {
      data.name = undefined;
    }
  }

  if (typeof data.description === 'string' && data.description.trim() === '') {
    data.description = null;
  }

  return data;
}

function normalizeContributionPayload(payload: any) {
  const data = { ...payload };

  if (data.investmentId !== undefined) {
    const parsed = Number(data.investmentId);
    if (!Number.isNaN(parsed)) {
      data.investmentId = parsed;
    }
  }

  if (data.date && typeof data.date === 'string') {
    const [year, month, day] = data.date.split('-').map(Number);
    if (year && month && day) {
      data.date = new Date(Date.UTC(year, month - 1, day, 12, 0, 0));
    } else {
      data.date = new Date(data.date);
    }
  }

  if (typeof data.notes === 'string' && data.notes.trim() === '') {
    data.notes = null;
  }

  return data;
}

export class InvestmentService {
  constructor(private storage: IStorage) {}

  listGroups() {
    return this.storage.getInvestmentGroups();
  }

  getGroup(id: number) {
    return this.storage.getInvestmentGroup(id);
  }

  createGroup(payload: unknown) {
    const normalized = normalizeInvestmentGroupPayload(payload);
    const data = insertInvestmentGroupSchema.parse(normalized);
    return this.storage.createInvestmentGroup(data);
  }

  updateGroup(id: number, payload: unknown) {
    const normalized = normalizeInvestmentGroupPayload(payload);
    const data = insertInvestmentGroupSchema.partial().parse(normalized);
    return this.storage.updateInvestmentGroup(id, data);
  }

  deleteGroup(id: number) {
    return this.storage.deleteInvestmentGroup(id);
  }

  listInvestments() {
    return this.storage.getInvestments();
  }

  getInvestment(id: number) {
    return this.storage.getInvestment(id);
  }

  createInvestment(payload: unknown) {
    const normalized = normalizeInvestmentPayload(payload, false);
    const data = insertInvestmentSchema.parse(normalized);
    return this.storage.createInvestment(data);
  }

  updateInvestment(id: number, payload: unknown) {
    const normalized = normalizeInvestmentPayload(payload, true);
    const data = insertInvestmentSchema.partial().parse(normalized);
    return this.storage.updateInvestment(id, data);
  }

  deleteInvestment(id: number) {
    return this.storage.deleteInvestment(id);
  }

  listContributions(investmentId?: number) {
    return this.storage.getInvestmentContributions(investmentId);
  }

  getContribution(id: number) {
    return this.storage.getInvestmentContribution(id);
  }

  async createContribution(payload: unknown) {
    const normalized = normalizeContributionPayload(payload);
    const data = insertInvestmentContributionSchema.parse(normalized);
    const contribution = await this.storage.createInvestmentContribution(data);

    const investment = await this.storage.getInvestment(contribution.investmentId);
    if (investment) {
      const delta = contribution.type === 'withdrawal' ? -Number(contribution.amount) : Number(contribution.amount);
      const newValue = (Number(investment.currentValue) + delta).toString();
      await this.storage.updateInvestment(investment.id, { currentValue: newValue });
    }

    return contribution;
  }

  async updateContribution(id: number, payload: unknown) {
    const normalized = normalizeContributionPayload(payload);
    const data = insertInvestmentContributionSchema.partial().parse(normalized);

    const old = await this.storage.getInvestmentContribution(id);
    const contribution = await this.storage.updateInvestmentContribution(id, data);

    if (old && contribution) {
      const investmentId = contribution.investmentId ?? old.investmentId;
      const investment = await this.storage.getInvestment(investmentId);
      if (investment) {
        const oldSigned = old.type === 'withdrawal' ? -Number(old.amount) : Number(old.amount);
        const newSigned = contribution.type === 'withdrawal' ? -Number(contribution.amount) : Number(contribution.amount);
        const diff = newSigned - oldSigned;
        if (diff !== 0) {
          const newValue = (Number(investment.currentValue) + diff).toString();
          await this.storage.updateInvestment(investment.id, { currentValue: newValue });
        }
      }
    }

    return contribution;
  }

  async deleteContribution(id: number) {
    const old = await this.storage.getInvestmentContribution(id);
    const result = await this.storage.deleteInvestmentContribution(id);

    if (result && old) {
      const investment = await this.storage.getInvestment(old.investmentId);
      if (investment) {
        const signed = old.type === 'withdrawal' ? -Number(old.amount) : Number(old.amount);
        const newValue = (Number(investment.currentValue) - signed).toString();
        await this.storage.updateInvestment(investment.id, { currentValue: newValue });
      }
    }

    return result;
  }
}
