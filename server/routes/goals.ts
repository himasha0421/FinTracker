import { Router } from 'express';
import { HttpError } from '../errors';
import { wrap } from './utils';
import type { GoalService } from '../services/goalService';

export function createGoalsRouter(service: GoalService) {
  const router = Router();

  router.get(
    '/',
    wrap(async (_req, res) => {
      const goals = await service.listGoals();
      res.json(goals);
    })
  );

  router.get(
    '/:id',
    wrap(async (req, res) => {
      const id = Number(req.params.id);
      const goal = await service.getGoal(id);
      if (!goal) {
        throw new HttpError(404, 'Financial goal not found');
      }
      res.json(goal);
    })
  );

  router.post(
    '/',
    wrap(async (req, res) => {
      const goal = await service.createGoal(req.body);
      res.status(201).json(goal);
    })
  );

  router.patch(
    '/:id',
    wrap(async (req, res) => {
      const id = Number(req.params.id);
      const updated = await service.updateGoal(id, req.body);
      if (!updated) {
        throw new HttpError(404, 'Financial goal not found');
      }
      res.json(updated);
    })
  );

  router.delete(
    '/:id',
    wrap(async (req, res) => {
      const id = Number(req.params.id);
      const deleted = await service.deleteGoal(id);
      if (!deleted) {
        throw new HttpError(404, 'Financial goal not found');
      }
      res.status(204).end();
    })
  );

  return router;
}
