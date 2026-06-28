/**
 * tests.js
 * API endpoints for test management.
 * Routes: POST, GET, PUT, DELETE /tests
 * Authorization: Teachers can create/edit/delete/publish, students can view published tests
 * Used by: Frontend test pages
 */

import { Router } from 'express';
import TestService from '../services/TestService.js';
import { validateRequest, schemas } from '../middleware/validationMiddleware.js';
import { requireRole } from '../middleware/rbacMiddleware.js';
import logger from '../utils/logger.js';

const router = Router();

/**
 * POST /tests
 * Create a new test (teacher only)
 */
router.post(
  '/',
  requireRole('teacher'),
  validateRequest(schemas.createTest),
  async (req, res) => {
    const userId = req.user?.id;
    const test = await TestService.createTest(req.validated, userId);

    res.status(201).json({
      success: true,
      test,
    });
  },
);

/**
 * GET /tests
 * Get all tests with optional filters
 * Query params: subject, status, page, pageSize
 */
router.get('/', async (req, res) => {
  const { subject, status, page = 1, pageSize = 50 } = req.query;

  const filters = {};
  if (subject) filters.subject = subject;
  if (status) filters.status = status;

  const result = await TestService.getAllTests(
    filters,
    parseInt(page),
    parseInt(pageSize),
  );

  res.json({
    success: true,
    tests: result.items,
    pagination: {
      page: result.page,
      pageSize: result.perPage,
      total: result.totalItems,
      totalPages: result.totalPages,
    },
  });
});

/**
 * GET /tests/:id
 * Get a single test by ID
 */
router.get('/:id', async (req, res) => {
  const { id } = req.params;
  const test = await TestService.getTest(id);

  if (!test) {
    throw new Error('Test not found');
  }

  res.json({
    success: true,
    test,
  });
});

/**
 * PUT /tests/:id
 * Update a test (teacher only)
 */
router.put(
  '/:id',
  requireRole('teacher'),
  validateRequest(schemas.updateTest),
  async (req, res) => {
    const { id } = req.params;
    const test = await TestService.updateTest(id, req.validated);

    res.json({
      success: true,
      test,
    });
  },
);

/**
 * DELETE /tests/:id
 * Delete a test (teacher only)
 */
router.delete('/:id', requireRole('teacher'), async (req, res) => {
  const { id } = req.params;
  await TestService.deleteTest(id);

  res.json({
    success: true,
    message: 'Test deleted',
  });
});

/**
 * POST /tests/:id/publish
 * Publish a test (teacher only)
 */
router.post('/:id/publish', requireRole('teacher'), async (req, res) => {
  const { id } = req.params;
  const test = await TestService.publishTest(id);

  res.json({
    success: true,
    test,
  });
});

/**
 * POST /tests/:id/questions
 * Add questions to a test (teacher only)
 * Body: { questionIds: ["id1", "id2", ...] }
 */
router.post(
  '/:id/questions',
  requireRole('teacher'),
  validateRequest(schemas.addQuestions),
  async (req, res) => {
    const { id } = req.params;
    const { questionIds } = req.validated;
    const test = await TestService.addQuestionsToTest(id, questionIds);

    res.json({
      success: true,
      test,
    });
  },
);

/**
 * DELETE /tests/:id/questions/:questionId
 * Remove a question from a test (teacher only)
 */
router.delete(
  '/:id/questions/:questionId',
  requireRole('teacher'),
  async (req, res) => {
    const { id, questionId } = req.params;
    await TestService.removeQuestionFromTest(id, questionId);

    res.json({
      success: true,
      message: 'Question removed from test',
    });
  },
);

export default router;
