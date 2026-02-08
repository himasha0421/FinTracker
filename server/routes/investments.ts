import { Router } from 'express';
import { HttpError } from '../errors';
import { wrap } from './utils';
import type { InvestmentService } from '../services/investmentService';

export function createInvestmentsRouter(service: InvestmentService) {
  const router = Router();

  router.get(
    '/',
    wrap(async (_req, res) => {
      const investments = await service.listInvestments();
      res.json(investments);
    })
  );

  router.get(
    '/:id',
    wrap(async (req, res) => {
      const id = Number(req.params.id);
      const investment = await service.getInvestment(id);
      if (!investment) {
        throw new HttpError(404, 'Investment not found');
      }
      res.json(investment);
    })
  );

  router.post(
    '/',
    wrap(async (req, res) => {
      const investment = await service.createInvestment(req.body);
      res.status(201).json(investment);
    })
  );

  router.patch(
    '/:id',
    wrap(async (req, res) => {
      const id = Number(req.params.id);
      const updated = await service.updateInvestment(id, req.body);
      if (!updated) {
        throw new HttpError(404, 'Investment not found');
      }
      res.json(updated);
    })
  );

  router.delete(
    '/:id',
    wrap(async (req, res) => {
      const id = Number(req.params.id);
      const deleted = await service.deleteInvestment(id);
      if (!deleted) {
        throw new HttpError(404, 'Investment not found');
      }
      res.status(204).end();
    })
  );

  return router;
}
