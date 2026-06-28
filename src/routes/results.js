/**
 * results.js
 * API endpoints for test results.
 * Routes: POST, GET /results
 * Authorization: Students can start/submit their own tests, teachers can view results
 * Used by: Frontend test taking and results pages
 */

import { Router } from 'express';
import ResultsService from '../services/ResultsService.js';
import { validateRequest, schemas } from '../middleware/validationMiddleware.js';
import { requireRole } from '../middleware/rbacMiddleware.js';
import logger from '../utils/logger.js';

const router = Router();

/**
 * POST /results/start
 * Start a test (student only)
 * Body: { testId }
 */
router.post(
  '/start',
  requireRole('student'),
  validateRequest(schemas.startTest),
  async (req, res) => {
    const studentId = req.user?.id;
    const { testId } = req.validated;
    const result = await ResultsService.startTest(testId, studentId);

    res.status(201).json({
      success: true,
      result,
    });
  },
);

/**
 * POST /results/:id/answer
 * Submit an answer to a question (student only)
 * Body: { questionId, answer }
 */
router.post(
  '/:id/answer',
  requireRole('student'),
  validateRequest(schemas.submitAnswer),
  async (req, res) => {
    const { id } = req.params;
    const { questionId, answer } = req.validated;
    const result = await ResultsService.submitAnswer(id, questionId, answer);

    res.json({
      success: true,
      result,
    });
  },
);

/**
 * POST /results/:id/submit
 * Submit a test (student only)
 */
router.post('/:id/submit', requireRole('student'), async (req, res) => {
  const { id } = req.params;
  const result = await ResultsService.submitTest(id);
  const scoredResult = await ResultsService.calculateScore(id);

  res.json({
    success: true,
    result: scoredResult,
  });
});

/**
 * GET /results/:id
 * Get a single test result
 * Authorization: Student who took the test or teacher
 */
router.get('/:id', async (req, res) => {
  const { id } = req.params;
  const userId = req.user?.id;

  const result = await ResultsService.getResult(id);

  if (!result) {
    throw new Error('Test result not found');
  }

  // Authorization check: allow if student is the one who took the test or user is teacher
  const isOwnResult = result.studentId === userId;
  const isTeacher = req.user?.role === 'teacher';

  if (!isOwnResult && !isTeacher) {
    throw new Error('Forbidden');
  }

  res.json({
    success: true,
    result,
  });
});

/**
 * GET /results/student/:studentId
 * Get all test results for a student
 * Authorization: Student viewing own results or teacher
 */
router.get('/student/:studentId', async (req, res) => {
  const { studentId } = req.params;
  const userId = req.user?.id;

  // Authorization check: allow if viewing own results or user is teacher
  const isOwnResults = studentId === userId;
  const isTeacher = req.user?.role === 'teacher';

  if (!isOwnResults && !isTeacher) {
    throw new Error('Forbidden');
  }

  const resultData = await ResultsService.getStudentResults(studentId);

  res.json({
    success: true,
    results: resultData.items,
    pagination: {
      page: resultData.page,
      pageSize: resultData.perPage,
      total: resultData.totalItems,
      totalPages: resultData.totalPages,
    },
  });
});

/**
 * GET /results/test/:testId
 * Get all test results for a test (teacher only)
 */
router.get('/test/:testId', requireRole('teacher'), async (req, res) => {
  const { testId } = req.params;

  const resultData = await ResultsService.getTestResults(testId);

  res.json({
    success: true,
    results: resultData.items,
    pagination: {
      page: resultData.page,
      pageSize: resultData.perPage,
      total: resultData.totalItems,
      totalPages: resultData.totalPages,
    },
  });
});

export default router;
