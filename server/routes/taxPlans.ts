import { Router } from 'express';
import { HttpError } from '../errors';
import { wrap } from './utils';
import type { TaxPlanService } from '../services/taxPlanService';

export function createTaxPlansRouter(service: TaxPlanService) {
  const router = Router();

  router.get(
    '/',
    wrap(async (_req, res) => {
      const plans = await service.listPlans();
      res.json(plans);
    })
  );

  router.post(
    '/',
    wrap(async (req, res) => {
      const plan = await service.createPlan(req.body);
      res.status(201).json(plan);
    })
  );

  router.post(
    '/default',
    wrap(async (_req, res) => {
      const plan = await service.createDefaultPlan();
      res.status(201).json(plan);
    })
  );

  router.get(
    '/:id',
    wrap(async (req, res) => {
      const plan = await service.getHydratedPlan(Number(req.params.id));
      if (!plan) {
        throw new HttpError(404, 'Tax plan not found');
      }
      res.json(plan);
    })
  );

  router.patch(
    '/:id',
    wrap(async (req, res) => {
      const plan = await service.updatePlan(Number(req.params.id), req.body);
      if (!plan) {
        throw new HttpError(404, 'Tax plan not found');
      }
      res.json(plan);
    })
  );

  router.delete(
    '/:id',
    wrap(async (req, res) => {
      const deleted = await service.deletePlan(Number(req.params.id));
      if (!deleted) {
        throw new HttpError(404, 'Tax plan not found');
      }
      res.status(204).end();
    })
  );

  router.post(
    '/:id/scenarios',
    wrap(async (req, res) => {
      const plan = await service.createScenario(Number(req.params.id), req.body);
      if (!plan) {
        throw new HttpError(404, 'Tax plan not found');
      }
      res.status(201).json(plan);
    })
  );

  router.patch(
    '/:id/scenarios/:scenarioId',
    wrap(async (req, res) => {
      const plan = await service.updateScenario(
        Number(req.params.id),
        Number(req.params.scenarioId),
        req.body
      );
      if (!plan) {
        throw new HttpError(404, 'Tax plan scenario not found');
      }
      res.json(plan);
    })
  );

  router.delete(
    '/:id/scenarios/:scenarioId',
    wrap(async (req, res) => {
      const plan = await service.deleteScenario(
        Number(req.params.id),
        Number(req.params.scenarioId)
      );
      if (!plan) {
        throw new HttpError(404, 'Tax plan scenario not found');
      }
      res.json(plan);
    })
  );

  return router;
}
