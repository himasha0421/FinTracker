import {
  insertInvestmentSchema,
  insertInvestmentContributionSchema,
} from '@shared/schema';
import type { IStorage } from '../storage';

function normalizeInvestmentPayload(payload: any) {
  const data = { ...payload };

  const normalizeDecimal = (value: any, fallback = '0') => {
    if (value === '' || value === null || value === undefined) return fallback;
    return value;
  };

  if (data.accountId === '' || data.accountId === undefined) {
    data.accountId = null;
  } else if (data.accountId !== null) {
    const parsed = Number(data.accountId);
    if (!Number.isNaN(parsed)) {
      data.accountId = parsed;
    }
  }

  data.currentValue = normalizeDecimal(data.currentValue);
  data.monthlyContribution = normalizeDecimal(data.monthlyContribution);

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

  listInvestments() {
    return this.storage.getInvestments();
  }

  getInvestment(id: number) {
    return this.storage.getInvestment(id);
  }

  createInvestment(payload: unknown) {
    const normalized = normalizeInvestmentPayload(payload);
    const data = insertInvestmentSchema.parse(normalized);
    return this.storage.createInvestment(data);
  }

  updateInvestment(id: number, payload: unknown) {
    const normalized = normalizeInvestmentPayload(payload);
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

  createContribution(payload: unknown) {
    const normalized = normalizeContributionPayload(payload);
    const data = insertInvestmentContributionSchema.parse(normalized);
    return this.storage.createInvestmentContribution(data);
  }

  updateContribution(id: number, payload: unknown) {
    const normalized = normalizeContributionPayload(payload);
    const data = insertInvestmentContributionSchema.partial().parse(normalized);
    return this.storage.updateInvestmentContribution(id, data);
  }

  deleteContribution(id: number) {
    return this.storage.deleteInvestmentContribution(id);
  }
}
