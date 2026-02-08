import { Router } from 'express';
import { HttpError } from '../errors';
import { wrap } from './utils';
import type { InvestmentService } from '../services/investmentService';

export function createInvestmentContributionsRouter(service: InvestmentService) {
  const router = Router();

  router.get(
    '/',
    wrap(async (req, res) => {
      const investmentId = req.query.investmentId
        ? Number(req.query.investmentId)
        : undefined;
      const contributions = await service.listContributions(
        Number.isNaN(investmentId as number) ? undefined : investmentId
      );
      res.json(contributions);
    })
  );

  router.get(
    '/:id',
    wrap(async (req, res) => {
      const id = Number(req.params.id);
      const contribution = await service.getContribution(id);
      if (!contribution) {
        throw new HttpError(404, 'Investment contribution not found');
      }
      res.json(contribution);
    })
  );

  router.post(
    '/',
    wrap(async (req, res) => {
      const contribution = await service.createContribution(req.body);
      res.status(201).json(contribution);
    })
  );

  router.patch(
    '/:id',
    wrap(async (req, res) => {
      const id = Number(req.params.id);
      const updated = await service.updateContribution(id, req.body);
      if (!updated) {
        throw new HttpError(404, 'Investment contribution not found');
      }
      res.json(updated);
    })
  );

  router.delete(
    '/:id',
    wrap(async (req, res) => {
      const id = Number(req.params.id);
      const deleted = await service.deleteContribution(id);
      if (!deleted) {
        throw new HttpError(404, 'Investment contribution not found');
      }
      res.status(204).end();
    })
  );

  return router;
}
