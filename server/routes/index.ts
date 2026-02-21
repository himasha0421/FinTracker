import { Router } from 'express';
import { AccountService } from '../services/accountService';
import { TransactionService } from '../services/transactionService';
import { GoalService } from '../services/goalService';
import { InvestmentService } from '../services/investmentService';
import { storage } from '../storage';
import { createAccountsRouter } from './accounts';
import { createTransactionsRouter } from './transactions';
import { createGoalsRouter } from './goals';
import { createInvestmentsRouter } from './investments';
import { createInvestmentContributionsRouter } from './investmentContributions';
import { createInvestmentGroupsRouter } from './investmentGroups';
import { wrap } from './utils';
import { HttpError } from '../errors';

export function createApiRouter() {
  const router = Router();

  const accountService = new AccountService(storage);
  const transactionService = new TransactionService(storage);
  const goalService = new GoalService(storage);
  const investmentService = new InvestmentService(storage);

  router.get(
    '/balance',
    wrap(async (_req, res) => {
      const balance = await accountService.getTotalBalance();
      res.json({ balance });
    })
  );

  router.get(
    '/accounts/:id/transactions',
    wrap(async (req, res) => {
      const accountId = Number(req.params.id);
      const transactions = await transactionService.getTransactionsByAccount(accountId);
      res.json(transactions);
    })
  );

  router.use('/accounts', createAccountsRouter(accountService));
  router.use('/transactions', createTransactionsRouter(transactionService));
  router.use('/goals', createGoalsRouter(goalService));
  router.use('/investment-groups', createInvestmentGroupsRouter(investmentService));
  router.use('/investments', createInvestmentsRouter(investmentService));
  router.use(
    '/investment-contributions',
    createInvestmentContributionsRouter(investmentService)
  );

  router.use(
    '*',
    wrap(async () => {
      throw new HttpError(404, 'Not found');
    })
  );

  return router;
}
