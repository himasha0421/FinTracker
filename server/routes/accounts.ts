import { Router } from 'express';
import { HttpError } from '../errors';
import { wrap } from './utils';
import type { AccountService } from '../services/accountService';

export function createAccountsRouter(service: AccountService) {
  const router = Router();

  router.get(
    '/',
    wrap(async (_req, res) => {
      const accounts = await service.listAccounts();
      res.json(accounts);
    })
  );

  router.get(
    '/:id',
    wrap(async (req, res) => {
      const id = Number(req.params.id);
      const account = await service.getAccount(id);
      if (!account) {
        throw new HttpError(404, 'Account not found');
      }
      res.json(account);
    })
  );

  router.post(
    '/',
    wrap(async (req, res) => {
      const account = await service.createAccount(req.body);
      res.status(201).json(account);
    })
  );

  router.patch(
    '/:id',
    wrap(async (req, res) => {
      const id = Number(req.params.id);
      const updated = await service.updateAccount(id, req.body);
      if (!updated) {
        throw new HttpError(404, 'Account not found');
      }
      res.json(updated);
    })
  );

  router.delete(
    '/:id',
    wrap(async (req, res) => {
      const id = Number(req.params.id);
      const success = await service.deleteAccount(id);
      if (!success) {
        throw new HttpError(404, 'Account not found');
      }
      res.status(204).end();
    })
  );

  return router;
}
