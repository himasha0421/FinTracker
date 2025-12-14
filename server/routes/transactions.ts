import { Router } from 'express';
import { HttpError } from '../errors';
import { wrap } from './utils';
import type { TransactionService } from '../services/transactionService';

export function createTransactionsRouter(service: TransactionService) {
  const router = Router();

  router.get(
    '/',
    wrap(async (req, res) => {
      const limit = req.query.limit ? Number(req.query.limit) : undefined;
      const transactions = await service.listTransactions(limit);
      res.json(transactions);
    })
  );

  router.get(
    '/:id',
    wrap(async (req, res) => {
      const id = Number(req.params.id);
      const transaction = await service.getTransaction(id);
      if (!transaction) {
        throw new HttpError(404, 'Transaction not found');
      }
      res.json(transaction);
    })
  );

  router.get(
    '/accounts/:accountId',
    wrap(async (req, res) => {
      const accountId = Number(req.params.accountId);
      const transactions = await service.getTransactionsByAccount(accountId);
      res.json(transactions);
    })
  );

  router.post(
    '/',
    wrap(async (req, res) => {
      const transaction = await service.createTransaction(req.body);
      res.status(201).json(transaction);
    })
  );

  router.patch(
    '/:id',
    wrap(async (req, res) => {
      const id = Number(req.params.id);
      const updated = await service.updateTransaction(id, req.body);
      if (!updated) {
        throw new HttpError(404, 'Transaction not found');
      }
      res.json(updated);
    })
  );

  router.delete(
    '/:id',
    wrap(async (req, res) => {
      const id = Number(req.params.id);
      const deleted = await service.deleteTransaction(id);
      if (!deleted) {
        throw new HttpError(404, 'Transaction not found');
      }
      res.status(204).end();
    })
  );

  return router;
}
