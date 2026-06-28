
import { Router } from 'express';
import healthCheck from './health-check.js';
import subscriptionsRouter from './ecommerce/subscriptions.js';
import authRouter from './auth.js';
import rbacRouter from './rbac.js';
import usersRouter from './users.js';
import questionsRouter from './questions.js';
import testsRouter from './tests.js';
import resultsRouter from './results.js';
import authMiddleware from '../middleware/authMiddleware.js';
import authMiddlewarePB from '../middleware/auth.js';

export default () => {
  const router = Router();

  // Route definitions WITHOUT redundant /api prefixes
  router.get('/health', healthCheck);
  router.use('/auth', authRouter);
  router.use('/ecommerce/subscriptions', authMiddleware, subscriptionsRouter);
  router.use('/rbac', authMiddlewarePB, rbacRouter);
  router.use('/users', authMiddlewarePB, usersRouter);
  router.use('/questions', authMiddleware, questionsRouter);
  router.use('/tests', authMiddleware, testsRouter);
  router.use('/results', authMiddleware, resultsRouter);

  return router;
};
