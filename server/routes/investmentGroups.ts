import { Router } from 'express';
import { HttpError } from '../errors';
import { wrap } from './utils';
import type { InvestmentService } from '../services/investmentService';

export function createInvestmentGroupsRouter(service: InvestmentService) {
  const router = Router();

  router.get(
    '/',
    wrap(async (_req, res) => {
      const groups = await service.listGroups();
      res.json(groups);
    })
  );

  router.get(
    '/:id',
    wrap(async (req, res) => {
      const id = Number(req.params.id);
      const group = await service.getGroup(id);
      if (!group) {
        throw new HttpError(404, 'Investment group not found');
      }
      res.json(group);
    })
  );

  router.post(
    '/',
    wrap(async (req, res) => {
      const group = await service.createGroup(req.body);
      res.status(201).json(group);
    })
  );

  router.patch(
    '/:id',
    wrap(async (req, res) => {
      const id = Number(req.params.id);
      const updated = await service.updateGroup(id, req.body);
      if (!updated) {
        throw new HttpError(404, 'Investment group not found');
      }
      res.json(updated);
    })
  );

  router.delete(
    '/:id',
    wrap(async (req, res) => {
      const id = Number(req.params.id);
      const deleted = await service.deleteGroup(id);
      if (!deleted) {
        throw new HttpError(404, 'Investment group not found');
      }
      res.status(204).end();
    })
  );

  return router;
}
