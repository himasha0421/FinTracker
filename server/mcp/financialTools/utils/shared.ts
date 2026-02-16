import type { Account } from '@shared/schema';
import { logger } from '../../../logger';

export type FlowKind = 'income' | 'expense' | 'net';
export type BreakdownDimension = 'assignee' | 'category' | 'subcategory' | 'account' | 'month';
export type Granularity = 'daily' | 'weekly' | 'monthly';
export type InvestmentContributionType = 'contribution' | 'withdrawal';

export type DateRange = {
  start?: Date;
  end?: Date;
};

export type TransactionFilters = {
  startDate?: string;
  endDate?: string;
  accountIds?: number[];
  assignee?: string;
  category?: string;
  subcategory?: string;
  type?: 'income' | 'expense';
  minAmount?: number;
  maxAmount?: number;
};

const DATE_ONLY_REGEX = /^\d{4}-\d{2}-\d{2}$/;

export const DEFAULT_LIMIT = 250;
export const MAX_LIMIT = 2000;
export const MAX_GROUPS = 200;
export const DEFAULT_INVESTMENT_CONTRIBUTION_MONTHS = 12;
export const MAX_CONTRIBUTION_MONTHS = 60;

export const ASSET_TYPE_GROUPS = [
  {
    key: 'static',
    title: 'Static Assets',
    description: 'Land, property, and vehicles held long-term.',
    types: ['land', 'car'],
  },
  {
    key: 'overseas',
    title: 'Overseas Investments',
    description: 'Foreign holdings tracked separately.',
    types: ['overseas_investment'],
  },
  {
    key: 'overseas_liquid',
    title: 'Overseas Liquid Assets',
    description: 'Fixed deposits and other liquid positions abroad.',
    types: ['fixed_deposit'],
  },
] as const;

const ASSET_TYPE_SET = new Set(ASSET_TYPE_GROUPS.flatMap(group => group.types));
const CONTRIBUTION_ASSET_TYPE_SET = new Set(['land', 'car']);

export function isAssetType(type: string): boolean {
  return ASSET_TYPE_SET.has(type);
}

export function isContributionAssetType(type: string): boolean {
  return CONTRIBUTION_ASSET_TYPE_SET.has(type);
}

export function toolResult(payload: unknown) {
  return {
    content: [
      {
        type: 'text' as const,
        text: JSON.stringify(payload, null, 2),
      },
    ],
  };
}

export function toolError(error: unknown) {
  const message = error instanceof Error ? error.message : 'Unknown error';
  logger.error({ err: error }, 'MCP financial tool failed');
  return {
    isError: true,
    content: [
      {
        type: 'text' as const,
        text: `Financial MCP error: ${message}`,
      },
    ],
  };
}

export function normalizeText(value?: string | null): string {
  return (value ?? '').trim().toLowerCase();
}

export function matchesText(value: string | null | undefined, expected?: string): boolean {
  if (!expected) return true;
  return normalizeText(value) === normalizeText(expected);
}

export function toNumber(value: unknown): number {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
}

export function round2(value: number): number {
  return Number(value.toFixed(2));
}

export function formatTypeLabel(value: string) {
  return value
    .split('_')
    .map(part => part.charAt(0).toUpperCase() + part.slice(1))
    .join(' ');
}

export function parseDateBoundary(value: string, boundary: 'start' | 'end'): Date {
  if (DATE_ONLY_REGEX.test(value)) {
    const suffix = boundary === 'start' ? 'T00:00:00.000Z' : 'T23:59:59.999Z';
    return new Date(`${value}${suffix}`);
  }

  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) {
    throw new Error(`Invalid date: ${value}`);
  }
  return parsed;
}

export function resolveDateRange(startDate?: string, endDate?: string): DateRange {
  const start = startDate ? parseDateBoundary(startDate, 'start') : undefined;
  const end = endDate ? parseDateBoundary(endDate, 'end') : undefined;

  if (start && end && start > end) {
    throw new Error('startDate must be before or equal to endDate');
  }

  return { start, end };
}

export function asDate(value: Date | string): Date {
  if (value instanceof Date) return value;
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) {
    throw new Error(`Invalid transaction date: ${value}`);
  }
  return parsed;
}

export function inDateRange(value: Date, range: DateRange): boolean {
  if (range.start && value < range.start) return false;
  if (range.end && value > range.end) return false;
  return true;
}

export function accountNameMap(accounts: Account[]): Map<number, string> {
  return new Map(accounts.map(account => [account.id, account.name]));
}

export function toMonthBucket(date: Date): string {
  return `${date.getUTCFullYear()}-${String(date.getUTCMonth() + 1).padStart(2, '0')}`;
}

export function toDailyBucket(date: Date): string {
  return `${date.getUTCFullYear()}-${String(date.getUTCMonth() + 1).padStart(2, '0')}-${String(
    date.getUTCDate()
  ).padStart(2, '0')}`;
}

export function toIsoWeekBucket(date: Date): string {
  const temp = new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()));
  const day = temp.getUTCDay() || 7;
  temp.setUTCDate(temp.getUTCDate() + 4 - day);
  const year = temp.getUTCFullYear();
  const yearStart = new Date(Date.UTC(year, 0, 1));
  const week = Math.ceil(((temp.getTime() - yearStart.getTime()) / 86400000 + 1) / 7);
  return `${year}-W${String(week).padStart(2, '0')}`;
}

export function toBucket(date: Date, granularity: Granularity): string {
  if (granularity === 'daily') return toDailyBucket(date);
  if (granularity === 'weekly') return toIsoWeekBucket(date);
  return toMonthBucket(date);
}
