import { Router } from 'express';
import multer from 'multer';
import { HttpError } from '../errors';
import { wrap } from './utils';
import { extractTransactionsFromStatement, type SchemaHints } from '../services/statementExtractionService';

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 20 * 1024 * 1024 },
});

const ACCEPTED_MIME_PREFIXES = ['image/'];
const ACCEPTED_MIME_TYPES = new Set(['application/pdf']);

function isAcceptedMimeType(mimeType: string): boolean {
  return (
    ACCEPTED_MIME_PREFIXES.some(prefix => mimeType.startsWith(prefix)) ||
    ACCEPTED_MIME_TYPES.has(mimeType)
  );
}

function parseSchemaHints(raw: unknown): SchemaHints {
  if (typeof raw !== 'string' || !raw) return {};
  try {
    const parsed = JSON.parse(raw);
    return typeof parsed === 'object' && parsed !== null ? parsed : {};
  } catch {
    return {};
  }
}

export function createChatRouter() {
  const router = Router();

  router.post(
    '/',
    upload.single('file'),
    wrap(async (req, res) => {
      const file = req.file;
      const message = typeof req.body.message === 'string' ? req.body.message : undefined;

      if (!file && !message) {
        throw new HttpError(400, 'No file or message provided');
      }

      let transactions: unknown[] = [];

      if (file) {
        if (!isAcceptedMimeType(file.mimetype)) {
          throw new HttpError(400, 'Unsupported file type. Upload an image or PDF.');
        }

        const schemaHints = parseSchemaHints(req.body.schema_hints);
        const customerMessage = (message || '').trim() || 'Extract every transaction from this statement.';

        transactions = await extractTransactionsFromStatement(
          file.buffer,
          file.mimetype,
          customerMessage,
          schemaHints
        );
      }

      const responseText = transactions.length
        ? `I've extracted ${transactions.length} transaction(s) from your statement.`
        : 'No transactions were found.';

      res.json({
        response: responseText,
        data: transactions,
        task_type: transactions.length ? 'add_transactions' : null,
      });
    })
  );

  return router;
}
