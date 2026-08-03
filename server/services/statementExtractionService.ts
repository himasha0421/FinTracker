import { execFile } from 'child_process';
import { promisify } from 'util';
import { randomUUID } from 'crypto';
import { mkdtemp, writeFile, rm } from 'fs/promises';
import { tmpdir } from 'os';
import path from 'path';
import { logger } from '../logger';

const execFileAsync = promisify(execFile);

const CLAUDE_BIN = process.env.CLAUDE_CLI_PATH || 'claude';
const CLAUDE_TIMEOUT_MS = 120_000;

const EXTENSION_BY_MIME: Record<string, string> = {
  'image/png': '.png',
  'image/jpeg': '.jpg',
  'image/jpg': '.jpg',
  'image/webp': '.webp',
  'image/gif': '.gif',
  'application/pdf': '.pdf',
};

export type SchemaHints = {
  categories?: string[];
  assignees?: string[];
  subcategoriesByCategory?: Record<string, string[]>;
};

const DEFAULT_CATEGORIES = [
  'Income',
  'Salary',
  'Savings',
  'Bills',
  'Housing',
  'Transport',
  'Vacations',
  'Groceries',
  'Dining Out',
  'Shopping',
  'Health & Wellness',
  'Friends & Gatherings',
];

const DEFAULT_ASSIGNEES = ['None', 'Hima', 'Thami'];

function buildPrompt(filePath: string, customerMessage: string, hints: SchemaHints): string {
  const categories = hints.categories?.length ? hints.categories : DEFAULT_CATEGORIES;
  const assignees = hints.assignees?.length ? hints.assignees : DEFAULT_ASSIGNEES;
  const subcategoriesByCategory = hints.subcategoriesByCategory || {};

  const now = new Date();
  const currentYear = now.getFullYear();
  const currentMonth = now.toLocaleString('en-US', { month: 'long' });
  const todayIso = now.toISOString().slice(0, 10);

  const subcategoryLines =
    Object.entries(subcategoriesByCategory)
      .filter(([, subs]) => subs?.length)
      .map(([cat, subs]) => `  - ${cat}: ${subs.join(', ')}`)
      .join('\n') || '  (none provided)';

  return `You are an expert financial analyst. Read the bank or credit card statement file at ${filePath} (image or PDF). Extract every real transaction precisely.

USER REQUEST
${customerMessage}

CURRENT DATE CONTEXT
- Today: ${todayIso} (year ${currentYear}, month ${currentMonth})
- If a transaction row shows only a day/month, infer the year from the statement period header. If still ambiguous, use ${currentYear}; if the resulting date would be in the future, use ${currentYear - 1}.

FIELD RULES
- description: concise lower-case description, max 3 words (e.g. "grocery store", "netflix sub").
- amount: positive number with up to 2 decimals. Never negative.
- date: format YYYY-MM-DD.
- category: must be exactly one of: ${categories.join(', ')}.
- subcategory: pick the best match from the list below for the chosen category. Omit if nothing fits.
- type: "income" for credits/deposits, "expense" for debits/withdrawals.
- assignee: one of ${assignees.join(', ')}. Use "None" if unsure.

SUBCATEGORIES BY CATEGORY
${subcategoryLines}

DEBIT vs CREDIT RULES
- If the statement has separate Debit and Credit columns: Debit -> expense, Credit -> income.
- If amounts use signs: negative -> expense, positive -> income (unless the statement is clearly an "amount charged" view where everything is an expense).
- Refunds and cashback are income.

ROWS TO SKIP
- Opening balance, closing balance, running balance, statement totals.
- Page headers, footers, column titles.
- Credit-card "PAYMENT THANK YOU" entries (these are payments to the card, not real spending).
- Interest charges/fees only if they are summary lines that duplicate already-listed individual fees.

OUTPUT
- Respond with ONLY a single JSON object of the form {"transactions": [...]}. No prose, no markdown fences, no explanation before or after.
- Each transaction object must have exactly these keys: description, amount, date, category, subcategory, type, assignee.
- If no transactions are found, respond with {"transactions": []}.`;
}

function extractJson(text: string): unknown {
  const fenced = text.match(/```(?:json)?\s*([\s\S]*?)```/i);
  const candidate = fenced ? fenced[1] : text;
  const start = candidate.indexOf('{');
  const end = candidate.lastIndexOf('}');
  if (start === -1 || end === -1 || end < start) {
    throw new Error('No JSON object found in Claude CLI output');
  }
  return JSON.parse(candidate.slice(start, end + 1));
}

export async function extractTransactionsFromStatement(
  fileBuffer: Buffer,
  mimeType: string,
  customerMessage: string,
  schemaHints: SchemaHints
): Promise<unknown[]> {
  const extension = EXTENSION_BY_MIME[mimeType] || '';
  const workDir = await mkdtemp(path.join(tmpdir(), 'statement-'));
  const filePath = path.join(workDir, `${randomUUID()}${extension}`);

  try {
    await writeFile(filePath, fileBuffer);

    const prompt = buildPrompt(filePath, customerMessage, schemaHints);

    const { stdout } = await execFileAsync(
      CLAUDE_BIN,
      ['-p', prompt, '--output-format', 'json', '--allowedTools', 'Read', '--add-dir', workDir],
      { timeout: CLAUDE_TIMEOUT_MS, maxBuffer: 10 * 1024 * 1024 }
    );

    const cliResult = JSON.parse(stdout) as { result?: string; is_error?: boolean };
    if (cliResult.is_error || !cliResult.result) {
      throw new Error('Claude CLI returned an error result');
    }

    const parsed = extractJson(cliResult.result) as { transactions?: unknown[] };
    return Array.isArray(parsed.transactions) ? parsed.transactions : [];
  } catch (error) {
    logger.error({ err: error }, 'Statement extraction via Claude CLI failed');
    return [];
  } finally {
    await rm(workDir, { recursive: true, force: true });
  }
}
