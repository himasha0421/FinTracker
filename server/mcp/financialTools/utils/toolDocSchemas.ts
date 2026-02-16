import { z } from 'zod';
import { MAX_CONTRIBUTION_MONTHS, MAX_GROUPS, MAX_LIMIT } from './shared';

const DATE_INPUT_FORMAT =
  'Use YYYY-MM-DD (preferred) or an ISO 8601 timestamp. Date-only values use UTC boundaries.';

const TEXT_FILTER_MATCH =
  'Case-insensitive exact match. Use discovery tools first when you are unsure of valid values.';

export function startDateArg() {
  return z
    .string()
    .optional()
    .describe(
      `Inclusive period start. ${DATE_INPUT_FORMAT} For date-only input, interpreted as 00:00:00.000Z.`
    );
}

export function endDateArg() {
  return z
    .string()
    .optional()
    .describe(
      `Inclusive period end. ${DATE_INPUT_FORMAT} For date-only input, interpreted as 23:59:59.999Z.`
    );
}

export function accountIdsArg() {
  return z
    .array(z.number().int().positive())
    .optional()
    .describe(
      'Filter to these account IDs only. Discover IDs with list_accounts or get_transaction_filter_options.'
    );
}

export function assigneeArg() {
  return z
    .string()
    .optional()
    .describe(
      `Filter by assignee name from transaction assignments. ${TEXT_FILTER_MATCH} Example: "Hima".`
    );
}

export function categoryArg() {
  return z
    .string()
    .optional()
    .describe(`Filter by transaction category. ${TEXT_FILTER_MATCH}`);
}

export function subcategoryArg() {
  return z
    .string()
    .optional()
    .describe(`Filter by transaction subcategory. ${TEXT_FILTER_MATCH}`);
}

export function transactionTypeArg() {
  return z
    .enum(['income', 'expense'])
    .optional()
    .describe('Transaction type filter. Allowed values: "income", "expense".');
}

export function minAmountArg() {
  return z
    .number()
    .nonnegative()
    .optional()
    .describe('Minimum absolute transaction amount (inclusive).');
}

export function maxAmountArg() {
  return z
    .number()
    .nonnegative()
    .optional()
    .describe('Maximum absolute transaction amount (inclusive).');
}

export function limitArg(max = MAX_LIMIT) {
  return z
    .number()
    .int()
    .positive()
    .max(max)
    .optional()
    .describe(`Maximum rows returned. Allowed range: 1-${max}.`);
}

export function sortDirectionArg() {
  return z
    .enum(['asc', 'desc'])
    .optional()
    .describe('Sort direction for the selected sort field. Default is "desc".');
}

export function flowArg() {
  return z
    .enum(['income', 'expense', 'net'])
    .optional()
    .describe('Metric used for ranking/values in grouped results. Default is "expense".');
}

export function breakdownDimensionArg() {
  return z
    .enum(['assignee', 'category', 'subcategory', 'account', 'month'])
    .optional()
    .describe(
      'Breakdown key used for grouping. Allowed values: "assignee", "category", "subcategory", "account", "month". Default is "category".'
    );
}

export function includeUnassignedArg() {
  return z
    .boolean()
    .optional()
    .describe(
      'If true (default), transactions without valid assignment share are included under pseudo-assignee "unassigned".'
    );
}

export function granularityArg() {
  return z
    .enum(['daily', 'weekly', 'monthly'])
    .optional()
    .describe(
      'Time bucket size for the trend series. Allowed values: "daily", "weekly", "monthly". Default is "monthly".'
    );
}

export function limitGroupsArg() {
  return z
    .number()
    .int()
    .positive()
    .max(MAX_GROUPS)
    .optional()
    .describe(`Maximum number of groups returned. Allowed range: 1-${MAX_GROUPS}.`);
}

export function includeCompletedArg() {
  return z
    .boolean()
    .optional()
    .describe('If false, completed goals are removed from results. Default is true.');
}

export function goalStatusArg() {
  return z
    .enum(['in-progress', 'completed', 'pending'])
    .optional()
    .describe('Goal status filter. Allowed values: "in-progress", "completed", "pending".');
}

export function contributionMonthsArg() {
  return z
    .number()
    .int()
    .positive()
    .max(MAX_CONTRIBUTION_MONTHS)
    .optional()
    .describe(
      `Number of months for contribution trend output. Allowed range: 1-${MAX_CONTRIBUTION_MONTHS}.`
    );
}

export function includeAssetsArg() {
  return z
    .boolean()
    .optional()
    .describe('If true, asset-class investments are included in holdings output. Default is false.');
}

export function investmentTypesArg() {
  return z
    .array(z.string())
    .optional()
    .describe(
      'Investment type filters (for example: etf, crypto, mutual_fund). Matching is case-insensitive exact type key.'
    );
}

export function accountIdArg() {
  return z
    .number()
    .int()
    .positive()
    .optional()
    .describe('Account ID filter. Discover valid values with list_accounts or get_investment_filter_options.');
}

export function holdingsSortByArg() {
  return z
    .enum(['currentValue', 'netContributions', 'monthlyContribution', 'name'])
    .optional()
    .describe(
      'Field used to sort holdings. Allowed values: "currentValue", "netContributions", "monthlyContribution", "name". Default is "currentValue".'
    );
}

export function assetGroupByArg() {
  return z
    .enum(['asset_group', 'type'])
    .optional()
    .describe('Grouping for asset output. Allowed values: "asset_group", "type". Default is "asset_group".');
}

export function includeEmptyGroupsArg() {
  return z
    .boolean()
    .optional()
    .describe('If true, include asset groups with zero matching assets. Default is false.');
}

export function investmentIdArg() {
  return z
    .number()
    .int()
    .positive()
    .optional()
    .describe('Investment ID filter. Discover valid values with get_investment_filter_options.');
}

export function contributionTypeArg() {
  return z
    .enum(['contribution', 'withdrawal'])
    .optional()
    .describe('Contribution event type filter. Allowed values: "contribution", "withdrawal".');
}

export function includeInvestmentDetailsArg() {
  return z
    .boolean()
    .optional()
    .describe('If true (default), each row includes investment name/type/currency metadata.');
}
